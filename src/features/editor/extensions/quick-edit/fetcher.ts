import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { z } from "zod";

const editRequestSchema = z.object({
  selectedCode: z.string(),
  fullCode: z.string(),
  instruction: z.string(),
});

const editResponseSchema = z.object({
  editedCode: z.string(),
});

type EditRequest = z.infer<typeof editRequestSchema>;
type EditResponse = z.infer<typeof editResponseSchema>;

export const fetcher = async (
  payload: EditRequest,
  signal: AbortSignal
): Promise<string | null> => {
  try {
    const validatedPayload = editRequestSchema.parse(payload);

    const response = await ky
      .post("/api/quick-edit", {
        json: validatedPayload,
        signal,
        timeout: 30_000,
        retry: 0,
      })
      .json<EditResponse>();

    const validatedResponse = editResponseSchema.parse(response);

    return validatedResponse.editedCode || null;
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

    toast.error("Failed to fetch AI Edit");
    return null;
  }
};
