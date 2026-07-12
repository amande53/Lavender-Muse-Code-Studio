import { DEFAULT_CONVERSATION_TITLE } from "@/convex/constants";
import { createCreateFilesTool } from "@/features/conversations/inngest/tools/create-files";
import { createCreateFolderTool } from "@/features/conversations/inngest/tools/create-folder";
import { createDeleteFilesTool } from "@/features/conversations/inngest/tools/delete-files";
import { createListFilesTool } from "@/features/conversations/inngest/tools/list-files";
import { createReadFilesTool } from "@/features/conversations/inngest/tools/read-files";
import { createRenameFileTool } from "@/features/conversations/inngest/tools/rename-file";
import { createScrapeUrlsTool } from "@/features/conversations/inngest/tools/scrape-urls";
import { createUpdateFileTool } from "@/features/conversations/inngest/tools/update-file";
import { inngest } from "@/inngest/client";
import { CODING_AGENT_SYSTEM_PROMPT, TITLE_GENERATOR_SYSTEM_PROMPT } from "@/inngest/constants";
import { convex } from "@/lib/convex-client";
import { anthropic, createAgent, createNetwork } from "@inngest/agent-kit";
import { NonRetriableError } from "inngest";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface MessageEvent {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  projectId: Id<"projects">;
  message: string;
}

const getInternalKey = () => process.env.MUSE_CONVEX_INTERNAL_KEY;

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
      const internalKey = getInternalKey();

      // Update the message with error content
      if (internalKey) {
        await step.run("update-message-on-failure", async () => {
          await convex.mutation(api.system.updateMessageFailure, {
            internalKey,
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
    const { messageId, conversationId, projectId, message } = event.data as MessageEvent;

    const internalKey = getInternalKey();

    if (!internalKey) {
      throw new NonRetriableError("MUSE_CONVEX_INTERNAL_KEY is not configured");
    }

    //TODO: Check if this is needed
    await step.sleep("wait-for-db-sync", "1s");

    // Get conversation for title generation check
    const conversation = await step.run("get-conversation", async () => {
      return await convex.query(api.system.getConversationById, {
        conversationId,
        internalKey,
      });
    });

    if (!conversation) {
      throw new NonRetriableError("Conversation not found");
    }

    // Fetch recent messages for conversation context
    const recentMessages = await step.run("get-recent-messages", async () => {
      return await convex.query(api.system.getRecentMessages, {
        conversationId,
        internalKey,
        limit: 10,
      });
    });

    // Build system prompt with conversation history ( exclude the current processing message )
    let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

    //Filter out the current processing message and empty messages
    const contextMessages = recentMessages.filter(
      (msg) => msg._id !== messageId && msg.content.trim() !== ""
    );

    if (contextMessages.length > 0) {
      const historyText = contextMessages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join("\n\n");
      systemPrompt += `\n\n## Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n## Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`;
    }

    // Generate conversation title if its still the default title
    const shouldGenerateTitle = conversation.title === DEFAULT_CONVERSATION_TITLE;

    if (shouldGenerateTitle) {
      const titleAgent = createAgent({
        name: "title-generator",
        system: TITLE_GENERATOR_SYSTEM_PROMPT,
        model: anthropic({
          model: "claude-haiku-4-5-20251001",
          defaultParameters: {
            temperature: 0,
            max_tokens: 50, // titles are short (3–6 words), so a small cap is fine
          },
        }),
      });

      const { output } = await titleAgent.run(message, { step });

      const textMessage = output.find((m) => m.type === "text" && m.role === "assistant");

      if (textMessage?.type === "text") {
        const title =
          typeof textMessage.content === "string"
            ? textMessage.content.trim()
            : textMessage.content
                .map((c) => c.text)
                .join("")
                .trim();
        if (title) {
          await step.run("update-conversation-title", async () => {
            await convex.mutation(api.system.updateConversationTitle, {
              internalKey,
              conversationId,
              title,
            });
          });
        }
      }
    }

    //Create the coding agent with file tools
    const codingAgent = createAgent({
      name: "Muse",
      description: "An expert AI coding assistant",
      system: systemPrompt,
      model: anthropic({
        model: "claude-opus-4-8",
        // Opus 4.8 rejects temperature/top_p/top_k (400) — steer via the system prompt instead
        defaultParameters: { max_tokens: 16000 },
      }),
      tools: [
        createListFilesTool({ internalKey, projectId }),
        createReadFilesTool({ internalKey, projectId }),
        createUpdateFileTool({ internalKey, projectId }),
        createCreateFilesTool({ projectId, internalKey }),
        createCreateFolderTool({ projectId, internalKey }),
        createRenameFileTool({ internalKey, projectId }),
        createDeleteFilesTool({ internalKey, projectId }),
        createScrapeUrlsTool(),
      ],
    });

    // Create network with single agent
    const network = createNetwork({
      name: "Muse-Network",
      agents: [codingAgent],
      maxIter: 20,
      router: ({ network }) => {
        const lastResult = network.state.results.at(-1);
        const hasTextResponse = lastResult?.output.some(
          (m) => m.type === "text" && m.role === "assistant"
        );
        const hasToolCalls = lastResult?.output.some((m) => m.type === "tool_call");

        //. Anthropic outputs text and tool calls together
        // Only stop if there's text WITHOUT tool calls
        if (hasTextResponse && !hasToolCalls) {
          return undefined;
        }
        return codingAgent;
      },
    });

    // Run the agent
    const result = await network.run(message);

    // Extract the assistant's text response from the last agent result
    const lastResult = result.state.results.at(-1);
    const textMessage = lastResult?.output.find((m) => m.type === "text" && m.role === "assistant");

    let assistantResponse = "I processed your request. Let me know if you need anything else.";

    if (textMessage?.type === "text") {
      const normalizedResponse =
        typeof textMessage.content === "string"
          ? textMessage.content.trim()
          : textMessage.content
              .map((c) => c.text)
              .join("")
              .trim();

      if (normalizedResponse) {
        assistantResponse = normalizedResponse;
      }
    }

    // Update the assistant message with the response ( This also sets status to completed)
    await step.run("update-assistant-message", async () => {
      await convex.mutation(api.system.updateMessageContent, {
        internalKey,
        messageId,
        content: assistantResponse,
      });
    });
    return { success: true, messageId, conversationId };
  }
);
