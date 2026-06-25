// src/inngest/functions.ts
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { inngest } from "./client";

export const demoGenerate = inngest.createFunction(
   { id: "demo-generate"},
      {event: "demo/generate"},
 
  async ({ step }) => {
    const result = await step.run("generate-text", async () => {
      return await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        prompt: "Write a vegetarian lasagna recipe for 4 people.",
      });
    });

    return result;
  }
);
