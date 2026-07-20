const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp", "ico"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "ogv"]);

export type BinaryPreviewKind = "image" | "audio" | "video" | "unsupported";

export const getBinaryPreviewKind = (fileName: string): BinaryPreviewKind => {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (AUDIO_EXTENSIONS.has(extension)) return "audio";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return "unsupported";
};
