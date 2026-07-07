import { useRef, useState } from "react";

import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  useCreateFile,
  useCreateFolder,
  useDeleteFile,
  useFolderContents,
  useRenameFile,
} from "@/features/projects/hooks/use-files";

import { useEditor } from "@/features/editor/hooks/use-editor";
import { RenameInput } from "@/features/projects/components/file-explorer/rename-input";
import { toast } from "sonner";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { getItemPadding } from "./constants";
import { CreateInput } from "./create-input";
import { LoadingRow } from "./loading-row";
import { TreeItemWrapper } from "./tree-item-wrapper";

export const Tree = ({
  item,
  level = 0,
  projectId,
}: {
  item: Doc<"files">;
  level?: number;
  projectId: Id<"projects">;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [pendingRename, setPendingRename] = useState<{ from: string; to: string } | null>(null);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const renameRequestRef = useRef(0);

  const renameFile = useRenameFile();
  const deleteFile = useDeleteFile();
  const createFile = useCreateFile();
  const createFolder = useCreateFolder();

  const { openFile, closeTab, activeTabId } = useEditor(projectId);

  const folderContents = useFolderContents({
    projectId,
    parentId: item._id,
    enabled: item.type === "folder" && isOpen,
  });

  const displayName =
    pendingRename !== null && item.name === pendingRename.from ? pendingRename.to : item.name;

  const handleRename = async (newName: string) => {
    setIsRenaming(false);

    if (newName === item.name) {
      return;
    }

    const requestId = ++renameRequestRef.current;
    setPendingRename({ from: item.name, to: newName });

    try {
      await renameFile({ id: item._id, newName });

      if (renameRequestRef.current === requestId) {
        setPendingRename(null);
      }
    } catch (error) {
      if (renameRequestRef.current === requestId) {
        setPendingRename(null);
      }

      toast.error(error instanceof Error ? error.message : "Failed to rename item");
    }
  };

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
          parentId: item._id,
        });
      } else {
        await createFolder({
          projectId,
          name,
          parentId: item._id,
        });
      }

      setCreating(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create item");
    }
  };

  const startCreating = (type: "file" | "folder") => {
    setIsOpen(true);
    setCreating(type);
  };

  if (item.type === "file") {
    const fileName = displayName;
    const isActive = activeTabId === item._id;

    if (isRenaming) {
      return (
        <RenameInput
          type="file"
          defaultValue={fileName}
          level={level}
          onSubmit={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
      );
    }

    return (
      <TreeItemWrapper
        item={item}
        level={level}
        isActive={isActive}
        onClick={() => openFile(item._id, { pinned: false })}
        onDoubleClick={() => openFile(item._id, { pinned: true })}
        onRename={() => setIsRenaming(true)}
        onDelete={() => {
          closeTab(item._id);
          deleteFile({ id: item._id });
        }}
      >
        <FileIcon
          fileName={fileName}
          autoAssign
          className="size-4"
        />
        <span className="truncate text-sm">{fileName}</span>
      </TreeItemWrapper>
    );
  }

  const folderName = displayName;

  const folderRender = (
    <>
      <div className="flex items-center gap-0.5">
        <ChevronRightIcon
          className={cn("size-4 shrink-0 text-muted-foreground", isOpen && "rotate-90")}
        />
        <FolderIcon
          folderName={folderName}
          className="size-4"
        />
      </div>
      <span className="truncate text-sm">{folderName}</span>
    </>
  );

  if (creating) {
    return (
      <>
        <button
          onClick={() => setIsOpen((value) => !value)}
          className="group flex items-center gap-1 h-5.5 hover:bg-accent/30 w-full"
          style={{ paddingLeft: getItemPadding(level, false) }}
        >
          {folderRender}
        </button>
        {isOpen && (
          <>
            {folderContents === undefined && <LoadingRow level={level + 1} />}
            <CreateInput
              type={creating}
              level={level + 1}
              onSubmit={handleCreate}
              onCancel={() => setCreating(null)}
            />
            {folderContents?.map((subItem) => (
              <Tree
                key={subItem._id}
                item={subItem}
                level={level + 1}
                projectId={projectId}
              />
            ))}
          </>
        )}
      </>
    );
  }

  if (isRenaming) {
    return (
      <>
        <RenameInput
          type="folder"
          defaultValue={folderName}
          isOpen={isOpen}
          level={level}
          onSubmit={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
        {isOpen && (
          <>
            {folderContents === undefined && <LoadingRow level={level + 1} />}
            {folderContents?.map((subItem) => (
              <Tree
                key={subItem._id}
                item={subItem}
                level={level + 1}
                projectId={projectId}
              />
            ))}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <TreeItemWrapper
        item={item}
        level={level}
        onClick={() => setIsOpen((value) => !value)}
        onRename={() => setIsRenaming(true)}
        onDelete={() => {
          // TODO: Close tab
          deleteFile({ id: item._id });
        }}
        onCreateFile={() => startCreating("file")}
        onCreateFolder={() => startCreating("folder")}
      >
        {folderRender}
      </TreeItemWrapper>
      {isOpen && (
        <>
          {folderContents === undefined && <LoadingRow level={level + 1} />}
          {folderContents?.map((subItem) => (
            <Tree
              key={subItem._id}
              item={subItem}
              level={level + 1}
              projectId={projectId}
            />
          ))}
        </>
      )}
    </>
  );
};
