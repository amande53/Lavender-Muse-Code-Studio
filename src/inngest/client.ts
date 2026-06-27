// src/inngest/client.ts
import { Inngest } from "inngest";
import { sentryMiddleware } from "@inngest/middleware-sentry"

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "lavender-muse-code-studio",
  middleware: [sentryMiddleware()]
});
