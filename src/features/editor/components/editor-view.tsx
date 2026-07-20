import { DownloadIcon, FileQuestionIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { Id } from "@/convex/_generated/dataModel";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { TopNavigation } from "@/features/editor/components/top-navigation";
import { FileBreadcrumbs } from "@/features/editor/hooks/file-breadcrunmbs";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { getBinaryPreviewKind } from "@/features/editor/utils/binary-preview";
import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

const DEBOUNCE_MS = 1500;

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActiveFileBinary = activeFile && activeFile.storageId;

  // Cleanup pending debounced updates on unmount or filechange
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [activeTabId])
  

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center">
        <TopNavigation projectId={projectId} />
      </div>
      {activeTabId && <FileBreadcrumbs projectId={projectId} />}
      <div className="flex-1 min-h-0 bg-background">
        {!activeFile && (
          <div className="size-full flex items-center justify-center">
            <Image
              src="/lavender-muse-alt-logo.png"
              alt="Lavender Muse Code Studio"
              width={300}
              height={300}
              className="opacity-50"
            />
          </div>
        )}
        {activeFile && !isActiveFileBinary && (
          <CodeEditor
            key={activeFile._id}
            fileName={activeFile.name}
            initialValue={activeFile.content ?? ""}
            onChange={(content: string) => {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
              }

              timeoutRef.current = setTimeout(() => {
                updateFile({ id: activeFile._id, content });
              }, DEBOUNCE_MS);
            }}
          />
        )}
        {isActiveFileBinary && activeFile && (
          <BinaryFilePreview
            fileName={activeFile.name}
            url={activeFile.storageUrl ?? null}
          />
        )}
      </div>
    </div>
  );
};

const BinaryFilePreview = ({ fileName, url }: { fileName: string; url: string | null }) => {
  const kind = getBinaryPreviewKind(fileName);

  if (!url) {
    return (
      <div className="size-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading preview...</p>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="size-full flex items-center justify-center p-4 overflow-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (kind === "audio") {
    return (
      <div className="size-full flex items-center justify-center p-4">
        <audio
          src={url}
          controls
          className="w-full max-w-md"
        />
      </div>
    );
  }

  if (kind === "video") {
    return (
      <div className="size-full flex items-center justify-center p-4">
        <video
          src={url}
          controls
          className="max-w-full max-h-full"
        />
      </div>
    );
  }

  return (
    <div className="size-full flex items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
        <FileQuestionIcon className="size-6" />
        <p className="text-sm font-medium">Preview not supported for this file type</p>
        <a
          href={url}
          download={fileName}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <DownloadIcon className="size-3.5" />
          Download {fileName}
        </a>
      </div>
    </div>
  );
};
