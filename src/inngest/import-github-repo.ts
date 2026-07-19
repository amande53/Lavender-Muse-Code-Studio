import ky from "ky";
import { Octokit } from "octokit";
import { isBinaryFile } from "isbinaryfile";
import { NonRetriableError } from "inngest";

import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface ImportGithubRepoEvent {
  owner: string;
  repo: string;
  projectId: Id<"projects">;
  githubToken: string;
}

export const importGithubRepo = inngest.createFunction(
  {
    id: "import-github-repo",
    onFailure: async ({ event, step }) => {
      const internalKey = process.env.MUSE_CONVEX_INTERNAL_KEY;
      if (!internalKey) return;

      const { projectId } = event.data.event.data as ImportGithubRepoEvent;

      await step.run("set-failed-status", async () => {
        await convex.mutation(api.system.updateImportStatus, {
          internalKey,
          projectId,
          status: "failed",
        });
      });
    },
  },
  { event: "github/import.repo" },
  async ({ event, step }) => {
    const { owner, repo, projectId, githubToken } = event.data as ImportGithubRepoEvent;

    const internalKey = process.env.MUSE_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
      throw new NonRetriableError("MUSE_CONVEX_INTERNAL_KEY is not configured");
    }

    const octokit = new Octokit({ auth: githubToken });

    // Cleanup any existing files in the project
    await step.run("cleanup-project", async () => {
      await convex.mutation(api.system.cleanup, {
        internalKey,
        projectId,
      });
    });

    const tree = await step.run("fetch-repo-tree", async () => {
      const fetchTree = async (tree_sha: string) => {
        const { data } = await octokit.rest.git.getTree({
          owner,
          repo,
          tree_sha,
          recursive: "1",
        });

        return data;
      };

      let data;
      try {
        data = await fetchTree("main");
      } catch {
        // Fallback to master branch
        data = await fetchTree("master");
      }

      if (!data.truncated) {
        return data;
      }

      // GitHub truncates recursive tree responses for very large repos without
      // throwing, so rebuild the full listing by walking one directory at a time
      console.warn(
        `Recursive tree for ${owner}/${repo} was truncated; falling back to per-directory traversal`
      );

      const entries: typeof data.tree = [];
      const queue: { sha: string; prefix: string }[] = [{ sha: data.sha, prefix: "" }];

      while (queue.length > 0) {
        const { sha, prefix } = queue.shift()!;

        const { data: dir } = await octokit.rest.git.getTree({
          owner,
          repo,
          tree_sha: sha,
        });

        for (const item of dir.tree) {
          if (!item.path) {
            continue;
          }

          const path = prefix ? `${prefix}/${item.path}` : item.path;
          entries.push({ ...item, path });

          if (item.type === "tree" && item.sha) {
            queue.push({ sha: item.sha, prefix: path });
          }
        }
      }

      return { ...data, tree: entries, truncated: false };
    });

    // Sort folders by depth so parents are created before children
    // Input:  [{ path: "src/components" }, { path: "src" }, { path: "src/components/ui" }]
    // Output: [{ path: "src" }, { path: "src/components" }, { path: "src/components/ui" }]
    const folders = tree.tree
      .filter((item) => item.type === "tree" && item.path)
      .sort((a, b) => {
        const aDepth = a.path ? a.path.split("/").length : 0;
        const bDepth = b.path ? b.path.split("/").length : 0;

        return aDepth - bDepth;
      });

    // Return the folder map from the step so it can be used in subsequent steps
    // (Inngest serializes step results, so we use a plain object instead of Map)
    const folderIdMap = await step.run("create-folders", async () => {
      const map: Record<string, Id<"files">> = {};

      for (const folder of folders) {
        if (!folder.path) {
          continue;
        }

        const pathParts = folder.path.split("/");
        const name = pathParts.pop()!;
        const parentPath = pathParts.join("/");
        const parentId = parentPath ? map[parentPath] : undefined;

        const folderId = await convex.mutation(api.system.createFolder, {
          internalKey,
          projectId,
          name,
          parentId,
        });

        map[folder.path] = folderId;
      }

      return map;
    });

    // Get all files (blobs) from the tree
    const allFiles = tree.tree.filter((item) => item.type === "blob" && item.path && item.sha);

    const failedPaths = await step.run("create-files", async () => {
      const failed: string[] = [];

      for (const file of allFiles) {
        if (!file.path || !file.sha) {
          continue;
        }

        try {
          const { data: blob } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: file.sha,
          });

          const buffer = Buffer.from(blob.content, "base64");
          const isBinary = await isBinaryFile(buffer);

          const pathParts = file.path.split("/");
          const name = pathParts.pop()!;
          const parentPath = pathParts.join("/");
          const parentId = parentPath ? folderIdMap[parentPath] : undefined;

          if (isBinary) {
            const uploadUrl = await convex.mutation(api.system.generateUploadUrl, { internalKey });

            const { storageId } = await ky
              .post(uploadUrl, {
                headers: { "Content-Type": "application/octet-stream" },
                body: buffer,
              })
              .json<{ storageId: Id<"_storage"> }>();

            await convex.mutation(api.system.createBinaryFile, {
              internalKey,
              projectId,
              name,
              storageId,
              parentId,
            });
          } else {
            const content = buffer.toString("utf-8");

            await convex.mutation(api.system.createFile, {
              internalKey,
              projectId,
              name,
              content,
              parentId,
            });
          }
        } catch {
          console.error(`Failed to import file: ${file.path}`);
          failed.push(file.path);
        }
      }

      return failed;
    });

    await step.run("set-completed-status", async () => {
      const status =
        failedPaths.length === 0
          ? "completed"
          : failedPaths.length === allFiles.length
            ? "failed"
            : "completed_with_errors";

      await convex.mutation(api.system.updateImportStatus, {
        internalKey,
        projectId,
        status,
        importErrors: failedPaths.length > 0 ? failedPaths : undefined,
      });
    });

    return { success: true, projectId };
  }
);
