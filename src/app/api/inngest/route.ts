import { serve } from "inngest/next";

import { processMessage } from "@/features/conversations/inngest/process-message";
import { inngest } from "@/inngest/client";
import { exportToGithub } from "@/inngest/export-to-github";
import { demoError, demoGenerate } from "@/inngest/functions";
import { importGithubRepo } from "@/inngest/import-github-repo";

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
