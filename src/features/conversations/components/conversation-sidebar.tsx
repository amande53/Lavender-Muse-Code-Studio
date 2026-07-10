import ky from "ky";
import { toast } from "sonner";
import { useState } from "react";
import { CopyIcon, HistoryIcon, LoaderIcon, PlusIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "../hooks/use-conversations";
import { Id } from "@/convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "@/convex/constants";

interface ConversationSideBarProps {
  projectId: Id<"projects">;
}

export const ConversationSideBar = ({
  projectId
}: ConversationSideBarProps) => {
  const [
    selectedConversationId,
    setSelectedConversationId
  ] = useState<null | Id<"conversations">>(null); 
  const [input, setInput] = useState("");

  const createConversation = useCreateConversation()
  const conversations = useConversations(projectId)

  const activeConversationId = selectedConversationId ?? conversations?.[0]?._id ?? null

const activeConversation = useConversation(activeConversationId)

  const conversationMessages = useMessages(activeConversationId)

  const isProcessing = conversationMessages?.some(
    (msg) => msg.role === "assistant" && msg.status === "processing"
  )

  const processingMessage = conversationMessages
    ?.slice()
    .reverse()
    .find((msg) => msg.role === "assistant" && msg.status === "processing")

  const handleCreateConversation = async () => {
    try {
      const newConversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      })
      setSelectedConversationId(newConversationId)
      return newConversationId

    } catch {
      toast.error("Failed to create conversation. Please try again.")
      return null
    }
  }

  const handleCancel = async () => {
    if (!processingMessage) {
      return
    }

    try {
      await ky.delete("/api/messages", {
        json: {
          messageId: processingMessage._id,
        },
      })
      setInput("")
    } catch {
      toast.error("Failed to cancel message. Please try again.")
    }
    setInput("")
  }

  const handleSubmit = async (message: PromptInputMessage) => { 
    if (isProcessing) {
      await handleCancel()
      return
    }
    
    let conversationId = activeConversationId
    if (!conversationId) {
      conversationId = await handleCreateConversation()
      if (!conversationId) {
        return
      }
    }

    // Trigger Inngest function via API
    try { 
      await ky.post("/api/messages", {
        json: {
          conversationId,
          message: message.text
        },
      })
      setInput("")
    } catch {
      toast.error("Failed to send message. Please try again.")
    }
  }

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-8.75 flex items-center justify-between border-b">
        <div className="text-sm truncate pl-3">
          {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
        </div>
        <div className="flex items-center px-1 gap-1">
          <Button
            size="icon-xs"
            variant="highlight"
          >
            <HistoryIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="highlight"
            onClick={handleCreateConversation}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          {conversationMessages?.map((message, messageIndex) => (
            <Message
              key={message._id}
              from={message.role}
            >
              <MessageContent>
                {message.role === "assistant" && message.status === "processing" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <LoaderIcon className="size-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ) : (
                  <MessageResponse>{message.content}</MessageResponse>
                )}
              </MessageContent>
              {message.role === "assistant" &&
                message.status === "completed" &&
                messageIndex === (conversationMessages?.length ?? 0) - 1 && (
                  <MessageActions>
                    <MessageAction
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                      }}
                      label="Copy"
                    >
                      <CopyIcon className="size-3" />
                    </MessageAction>
                  </MessageActions>
                )}
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3">
        <PromptInput
          onSubmit={handleSubmit}
          className="mt-2"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask Muse anything..."
              onChange={(e) => {setInput(e.target.value)}}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              disabled={isProcessing ? false : !input}
              onStop={handleCancel}
              status={isProcessing ? "streaming" : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
