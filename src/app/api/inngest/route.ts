import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { demoError, demoGenerate } from "@/inngest/functions";
import { importGithubRepo } from "@/inngest/import-github-repo";
import { exportToGithub } from "@/inngest/export-to-github";
import { processMessage } from "@/features/conversations/inngest/process-message";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    demoGenerate,
    demoError, 
    processMessage,
    importGithubRepo,
    exportToGithub,

  ],

});
