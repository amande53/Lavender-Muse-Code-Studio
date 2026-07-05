import { getItemPadding } from "@/features/projects/components/file-explorer/constants";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { ChevronRightIcon } from "lucide-react";
import { useRef, useState } from "react";

export const CreateInput = ({
  type,
  level,
  onSubmit,
  onCancel,
}: {
  type: "file" | "folder";
  level: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) => {
  const [value, setValue] = useState("");
  const finishedRef = useRef(false);

  const handleSubmit = () => {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    const trimmedValue = value.trim();

    if (trimmedValue) {
      onSubmit(trimmedValue);
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="flex h-5.5 w-full items-center gap-1 bg-accent/30"
      style={{ paddingLeft: getItemPadding(level, type === "file") }}
    >
      <div className="flex items-center gap-0.5">
        {type === "folder" && (
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        )}

        {type === "file" && (
          <FileIcon
            fileName={value}
            autoAssign
            className="size-4"
          />
        )}

        {type === "folder" && (
          <FolderIcon
            folderName={value}
            className="size-4"
          />
        )}
      </div>

      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            finishedRef.current = true;
            onCancel();
          }
        }}
        className="flex-1 bg-transparent text-sm outline-none focus:ring-inset focus:ring-ring"
      />
    </div>
  );
};
