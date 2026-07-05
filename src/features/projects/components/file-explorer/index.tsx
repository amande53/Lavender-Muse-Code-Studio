import { ChevronRightIcon, CopyMinusIcon, FilePlusIcon, FolderPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { Id } from "@/convex/_generated/dataModel";
import { CreateInput } from "@/features/projects/components/file-explorer/create-input";
import { LoadingRow } from "@/features/projects/components/file-explorer/loading-row";
import { Tree } from "@/features/projects/components/file-explorer/tree";
import {
  useCreateFile,
  useCreateFolder,
  useFolderContents,
} from "@/features/projects/hooks/use-files";
import { useProject } from "@/features/projects/hooks/use-projects";

export const FileExplorer = ({ projectId }: { projectId: Id<"projects"> }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [collapseKey, setCollapseKey] = useState(0);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);

  const project = useProject(projectId);
  const rootFiles = useFolderContents({
    projectId,
    parentId: null,
    enabled: isOpen,
  });

  const createFile = useCreateFile();
  const createFolder = useCreateFolder();

  const handleCreate = async (name: string) => {
    const type = creating;

    if (!type) {
      return;
    }

    try {
      if (type === "file") {
        await createFile({
          projectId,
          name,
          content: "",
          parentId: undefined,
        });
      } else {
        await createFolder({
          projectId,
          name,
          parentId: undefined,
        });
      }

      setCreating(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create item");
    }
  };

  return (
    <div className="h-full bg-sidebar">
      <ScrollArea>
        <div className="group/project flex h-5.5 w-full items-center gap-0.5 bg-accent font-bold">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => {
              setIsOpen((value) => !value);
            }}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-0.5 text-left"
          >
            <ChevronRightIcon
              className={cn("size-4 shrink-0 text-muted-foreground", isOpen && "rotate-90")}
            />

            <p className="line-clamp-1 text-xs uppercase">{project?.name ?? "Loading..."}</p>
          </button>

          <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-none duration-0 group-hover/project:opacity-100">
            <Button
              aria-label="New file"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsOpen(true);
                setCreating("file");
              }}
              variant="highlight"
              size="icon-xs"
            >
              <FilePlusIcon className="size-3.5" />
            </Button>

            <Button
              aria-label="New folder"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setIsOpen(true);
                setCreating("folder");
              }}
              variant="highlight"
              size="icon-xs"
            >
              <FolderPlusIcon className="size-3.5" />
            </Button>

            <Button
              aria-label="Collapse all"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCollapseKey((prev) => prev + 1);
              }}
              variant="highlight"
              size="icon-xs"
            >
              <CopyMinusIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        {isOpen && (
          <>
            {rootFiles === undefined && <LoadingRow level={0} />}
            {creating && (
              <CreateInput
                type={creating}
                level={0}
                onSubmit={handleCreate}
                onCancel={() => setCreating(null)}
              />
            )}
            {rootFiles?.map((item) => (
              <Tree
                key={`${item._id}-${collapseKey}`}
                item={item}
                level={0}
                projectId={projectId}
              />
            ))}
          </>
        )}
      </ScrollArea>
    </div>
  );
};