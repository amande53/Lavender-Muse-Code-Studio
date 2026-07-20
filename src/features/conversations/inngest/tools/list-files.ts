import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface ListFilesToolsOptions {
  internalKey: string;
  projectId: Id<"projects">;
}
  


export const createListFilesTool = ({ internalKey, projectId }: ListFilesToolsOptions) => {
  return createTool({
    name: "listFiles",
    description: "List all files and folders in the project. Returns names, Ids, types, and parentId for each item. Items with parentId: null are at the root level. use the ParentId to understand the folder structure - items with the same parentId are in the same folder.",
    parameters: z.object({}),
    handler: async (_, { step: toolStep }) => {
      try {
        return await toolStep?.run("list-files", async () => {
          const files = await convex.query(api.system.getProjectFiles, {
            internalKey,
            projectId,
          })

          // Sort: folders first, then files, both alphabetically by name
          const sorted = files.sort((a, b) => { 
            if (a.type !== b.type) { 
              return a.type === "folder" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
          const fileList = sorted.map((f) => ({
            id: f._id,
            name: f.name,
            type: f.type,
            parentId: f.parentId ?? null,
          }));
        return JSON.stringify(fileList);
        });
      } catch (error) {
        return `Error listing files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
