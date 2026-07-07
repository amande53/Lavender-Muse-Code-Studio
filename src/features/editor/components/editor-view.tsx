import { Id } from "@/convex/_generated/dataModel";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { TopNavigation } from "@/features/editor/components/top-navigation";
import { FileBreadcrumbs } from "@/features/editor/hooks/file-breadcrunmbs";
import { useEditor } from "@/features/editor/hooks/use-editor";
import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";
import Image from "next/image";
import { useRef } from "react";

const DEBOUNCE_MS = 1500;

export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const { activeTabId } = useEditor(projectId);
  const activeFile = useFile(activeTabId);
  const updateFile = useUpdateFile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isActiveFileBinary = activeFile && activeFile.storageId;

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
        {activeFile && (
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
        {isActiveFileBinary && <p>TODO: Implement binary preview</p>}
      </div>
    </div>
  );
};
