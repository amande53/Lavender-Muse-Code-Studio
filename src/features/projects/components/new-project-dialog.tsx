"use client";

import ky from "ky";
import { useState } from "react";
import { toast } from "sonner";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";
import { navigateFullPage } from "@/lib/navigation";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProjectDialog = ({ open, onOpenChange }: NewProjectDialogProps) => {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text) return;

    setIsSubmitting(true);
    try {
      const { projectId } = await ky
        .post("/api/projects/create-with-prompt", {
          json: { prompt: message.text.trim() },
        })
        .json<{ projectId: Id<"projects"> }>();

      toast.success("Project created successfully");
      onOpenChange(false);
      setInput("");
      navigateFullPage(`/projects/${projectId}`);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="hidden">
          <DialogTitle>What do you want to build?</DialogTitle>
          <DialogDescription>
            Describe your project idea and we&apos;ll help you get started.
          </DialogDescription>
        </DialogHeader>
        <PromptInput
          onSubmit={handleSubmit}
          className="border-none!"
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Describe your project idea..."
            onChange={(e) => setInput(e.target.value)}
              value={input}
              disabled={isSubmitting}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              disabled={!input.trim() || isSubmitting} />
            
            </PromptInputFooter>
        </PromptInput>
      </DialogContent>
    </Dialog>
  );
};
