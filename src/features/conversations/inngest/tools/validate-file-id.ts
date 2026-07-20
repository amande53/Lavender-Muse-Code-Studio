// Convex document IDs never contain slashes, dots, or whitespace. Models
// occasionally hallucinate a path-shaped value (e.g. "<folderId>/main.jsx")
// instead of using a real ID from listFiles - catch that before it reaches
// Convex's validator so the agent gets an actionable message immediately.
const INVALID_ID_CHARS = /[/\\.\s]/;

export const isValidFileId = (value: string): boolean =>
  value.length > 0 && !INVALID_ID_CHARS.test(value);

export const invalidFileIdMessage = (value: string): string =>
  `Error: "${value}" is not a valid file ID (looks like a path). Call listFiles first and use the exact "id" field it returns.`;
