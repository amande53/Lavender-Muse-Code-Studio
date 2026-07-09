import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { z } from "zod";

const suggestionSchema = z.object({
  fileName: z.string(),
  code: z.string(),
  currentLine: z.string(),
  previousLines: z.string(),
  textBeforeCursor: z.string(),
  textAfterCursor: z.string(),
  nextLines: z.string(),
  lineNumber: z.number(),
});

const suggestionResponseSchema = z.object({
  suggestion: z.string(),
});

type SuggestionRequest = z.infer<typeof suggestionSchema>;
type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;

export const fetcher = async (
  payload: SuggestionRequest,
  signal: AbortSignal
): Promise<string | null> => {
  try {
    const validatedPayload = suggestionSchema.parse(payload);

    const response = await ky
      .post("/api/suggestion", {
        json: validatedPayload,
        signal,
        timeout: 30_000,
        retry: 0,
      })
      .json<SuggestionResponse>();

    const validatedResponse = suggestionResponseSchema.parse(response);

    return validatedResponse.suggestion || null;
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return null;
    }

    if (error instanceof HTTPError) {
      const status = error.response.status;

      // Suggestions are optional; avoid noisy toasts for expected API/auth failures.
      if (status === 400 || status === 401 || status === 403 || status === 429 || status >= 500) {
        return null;
      }
    }

    toast.error("Failed to fetch AI completion");
    return null;
  }
};
