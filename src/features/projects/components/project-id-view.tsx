"use client";

import { useState } from "react";

import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { FaGithub } from "react-icons/fa";

const Tab = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex h-full cursor-pointer items-center gap-2 border-r px-3 text-muted-foreground hover:bg-accent/30",
        isActive && "bg-background text-foreground"
      )}
    >
      <span className="text-sm">{label}</span>
    </div>
  );
};

export const ProjectIdView = ({ projectId }: { projectId: Id<"projects"> }) => {
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");

  return (
    <div className="flex h-full flex-col">
      <nav className="flex h-[35px] items-center border-b bg-sidebar">
        <Tab
          label="Code"
          isActive={activeView === "editor"}
          onClick={() => setActiveView("editor")}
        />

        <Tab
          label="Preview"
          isActive={activeView === "preview"}
          onClick={() => setActiveView("preview")}
        />
        <div className="flex-1 flex justify-end h-full"> 
          <div className="flex items-center gap-1.5 h-full px-3 cursor-pointer text-muted-foreground hover:bg-accent/30 border-l">
            <FaGithub className="size-3.5" />
            <span className="text-sm">Export</span>
          </div>
        </div>
      </nav>

      <div className="relative flex-1">
        <div className={cn("absolute inset-0", activeView === "editor" ? "visible" : "invisible")}>
          Editor
        </div>

        <div className={cn("absolute inset-0", activeView === "preview" ? "visible" : "invisible")}>
          Preview
        </div>
      </div>
    </div>
  );
};
