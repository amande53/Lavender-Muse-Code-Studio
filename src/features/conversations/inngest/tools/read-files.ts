import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

import { invalidFileIdMessage,isValidFileId } from "./validate-file-id";

interface ReadFilesToolsOptions {
  internalKey: string;
  projectId: Id<"projects">;
}

const paramsSchema = z.object({
  fileIds: z
    .array(z.string().min(1, "File ID cannot be empty"))
    .min(1, "At least one file ID is required"),
});

export const createReadFilesTool = ({ internalKey, projectId }: ReadFilesToolsOptions) => {
  return createTool({
    name: "readFiles",
    description: "Read the content of files from the project. Returns file content.",
    parameters: z.object({
      fileIds: z.array(z.string().min(1, "File ID cannot be empty")),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);

      if (!parsed.success) {
        return `Error ${parsed.error.issues[0].message}`;
      }

      const { fileIds } = parsed.data;

      try {
        return await toolStep?.run("read-files", async () => {
          const results: { id: string; name: string; content: string }[] = [];

          for (const fileId of fileIds) {
            if (!isValidFileId(fileId)) {
              results.push({ id: fileId, name: fileId, content: invalidFileIdMessage(fileId) });
              continue;
            }

            const file = await convex.query(api.system.getFileById, {
              internalKey,
              projectId,
              fileId: fileId as Id<"files">,
            });

            if (file && file.content) {
              results.push({
                id: file._id,
                name: file.name,
                content: file.content,
              });
            }
          }

          if (results.length === 0) {
            return "No files found for the provided file IDs. use listFiles to get valid file IDs.";
          }

          return JSON.stringify(results);
        });
      } catch (error) {
        return `Error reading files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
