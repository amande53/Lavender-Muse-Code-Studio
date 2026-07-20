import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

import { invalidFileIdMessage,isValidFileId } from "./validate-file-id";

interface DeleteFilesToolOptions {
  internalKey: string;
  projectId: Id<"projects">;
}

const paramsSchema = z.object({
  fileIds: z
    .array(z.string().min(1, "File ID cannot be empty"))
    .min(1, "Provide at least one file ID"),
});

export const createDeleteFilesTool = ({ internalKey, projectId }: DeleteFilesToolOptions) => {
  return createTool({
    name: "deleteFiles",
    description:
      "Delete files or folders from the project. If deleting a folder, all contents will be deleted recursively.",
    parameters: z.object({
      fileIds: z.array(z.string()).describe("Array of file or folder IDs to delete"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileIds } = parsed.data;

      // Validate all files exist before running the step
      const filesToDelete: {
        id: string;
        name: string;
        type: string;
      }[] = [];

      for (const fileId of fileIds) {
        if (!isValidFileId(fileId)) {
          return invalidFileIdMessage(fileId);
        }

        let file;

        try {
          file = await convex.query(api.system.getFileById, {
            internalKey,
            projectId,
            fileId: fileId as Id<"files">,
          });
        } catch {
          return `Error: Invalid file ID "${fileId}". Use listFiles to get valid file IDs.`;
        }

        if (!file) {
          return `Error: File with ID "${fileId}" not found. Use listFiles to get valid file IDs.`;
        }

        filesToDelete.push({
          id: file._id,
          name: file.name,
          type: file.type,
        });
      }

      try {
        return await toolStep?.run("delete-files", async () => {
          const results: {
            id: string;
            name: string;
            type: string;
            success: boolean;
            error?: string;
          }[] = [];

          for (const file of filesToDelete) {
            try {
              await convex.mutation(api.system.deleteFile, {
                internalKey,
                projectId,
                fileId: file.id as Id<"files">,
              });

              results.push({
                id: file.id,
                name: file.name,
                type: file.type,
                success: true,
              });
            } catch (error) {
              results.push({
                id: file.id,
                name: file.name,
                type: file.type,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }

          return JSON.stringify(results);
        });
      } catch (error) {
        return `Error deleting files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
