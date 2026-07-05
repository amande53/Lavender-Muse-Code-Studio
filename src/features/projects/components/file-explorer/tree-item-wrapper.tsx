import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

import { Doc } from "@/convex/_generated/dataModel";
import { getItemPadding } from "@/features/projects/components/file-explorer/constants";

export const TreeItemWrapper = ({
  item,
  children,
  level = 0,
  isActive,
  onClick,
  onDoubleClick,
  onRename,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: {
  item: Doc<"files">;
  children: React.ReactNode;
  level?: number;
  isActive?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
}) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onRename) {
              e.preventDefault();
              onRename();
            }
          }}
          className={cn(
            "group flex h-5.5 w-full items-center gap-1 outline-none hover:bg-accent/30 focus:ring-1 focus:ring-inset focus:ring-ring",
            isActive && "bg-accent/30"
          )}
          style={{ paddingLeft: getItemPadding(level, item.type === "file") }}
        >
          {children}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-64"
      >
        {item.type === "folder" && (
          <>
            <ContextMenuItem
              onClick={onCreateFile}
              className="text-sm"
            >
              New File...
            </ContextMenuItem>
            <ContextMenuItem
              onClick={onCreateFolder}
              className="text-sm"
            >
              New Folder...
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={onRename}
          className="text-sm"
        >
          Rename...
          <ContextMenuShortcut>Enter</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={onDelete}
          className="text-sm"
        >
          Delete Permanently
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
