import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

import { invalidFileIdMessage,isValidFileId } from "./validate-file-id";

interface UpdateFileToolsOptions {
  internalKey: string;
  projectId: Id<"projects">;
}

const paramsSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  content: z.string(),
});

export const createUpdateFileTool = ({ internalKey, projectId }: UpdateFileToolsOptions) => {
  return createTool({
    name: "updateFile",
    description: "Update the content of an existing file",
    parameters: z.object({
      fileId: z.string().min(1, "File ID is required"),
      content: z.string().describe("The new content for the file"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);

      if (!parsed.success) {
        return `Error ${parsed.error.issues[0].message}`;
      }

      const { fileId, content } = parsed.data;

      if (!isValidFileId(fileId)) {
        return invalidFileIdMessage(fileId);
      }

      try {
        const file = await convex.query(api.system.getFileById, {
          internalKey,
          projectId,
          fileId: fileId as Id<"files">,
        });

        if (!file) {
          return `Error: File with ID ${fileId} not found. Use listFiles to get valid file IDs.`;
        }

        if (file.type === "folder") {
          return `Error: File with ID ${fileId} is a folder, not a file. You can only update file contents.`;
        }

        return await toolStep?.run("update-file", async () => {
          await convex.mutation(api.system.updateFile, {
            internalKey,
            projectId,
            fileId: fileId as Id<"files">,
            content,
          });

          return `File with ID ${fileId} updated successfully.`;
        });
      } catch (error) {
        return `Error updating file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
