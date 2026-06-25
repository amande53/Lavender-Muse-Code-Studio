// src/inngest/functions.ts
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { inngest } from "./client";
import { firecrawl } from "@/src/lib/firecrawl";

const URL_REGEX = /https?:\/\/[^\s]+/g

export const demoGenerate = inngest.createFunction(
   { id: "demo-generate"},
      {event: "demo/generate"},
 
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string}

    const urls = await step.run("exctract-urls", async () => {
      return prompt.match(URL_REGEX) ?? []
    }) as string[]

    const scrapedContent = await step.run("scrape-urls", async () => {
      const results = await Promise.all(
        urls.map(async (url) => {
          const result = await firecrawl.scrape(
            url,
            { formats: ["markdown"]},
          )

          return result.markdown ?? null
        })
      )
      return results.filter(Boolean).join("\n\n")
    })

    const finalPrompt = scrapedContent
      ? `Context:\n${scrapedContent}\n\Question: ${prompt}`
      : prompt

    await step.run("generate-text", async () => {
      return await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        prompt: finalPrompt,
      });
    });

  }
);
