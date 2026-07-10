import { inngest } from "@/inngest/client";
import { Id } from "../../../../convex/_generated/dataModel";
import { NonRetriableError } from "inngest";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";

interface MessageEvent {
  messageId: Id<"messages">;
  message?: string;
}

const internalKey = () => process.env.MUSE_CONVEX_INTERNAL_KEY;

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    cancelOn: [
      {
        event: "message/cancel",
        if: "event.data.messageId == async.data.messageId",
      },
    ],
    onFailure: async ({ event, step }) => {
      const { messageId } = event.data.event.data as MessageEvent;
      const key = internalKey();

      // Update the message with error content
      if (key) {
        await step.run("update-message-on-failure", async () => {
          await convex.mutation(api.system.updateMessageContent, {
            internalKey: key,
            messageId,
            content:
              "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          });
        });
      }
    },
  },
  {
    event: "message/sent",
  },
  async ({ event, step }) => {
    const { messageId, message } = event.data as MessageEvent;

    const key = internalKey();

    if (!key) {
      throw new NonRetriableError("MUSE_CONVEX_INTERNAL_KEY is not configured");
    }

    if (
      process.env.NODE_ENV !== "production" &&
      message === "__test_failure__"
    ) {
      throw new NonRetriableError("Testing process-message onFailure");
    }

    await step.sleep("wait-for-ai-processing", "5s");

    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey: key,
        messageId,
        content: "AI processed this message (TODO)",
      });
    });
  }
);
