"use client";

import { Allotment } from "allotment";
import { useState } from "react";
import { FaGithub } from "react-icons/fa";

import { Id } from "../../../../convex/_generated/dataModel";
import { FileExplorer } from "@/features/projects/components/file-explorer";
import { cn } from "@/lib/utils";
import { EditorView } from "@/features/editor/components/editor-view";
import { PreviewView } from "@/features/projects/components/preview-view";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 300;
const DEFAULT_MAIN_WIDTH = 1000;

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
      <nav className="flex h-8.75 items-center border-b bg-sidebar">
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

        <div className="flex h-full flex-1 justify-end">
          <div className="flex h-full cursor-pointer items-center gap-1.5 border-l px-3 text-muted-foreground hover:bg-accent/30">
            <FaGithub className="size-3.5" />
            <span className="text-sm">Export</span>
          </div>
        </div>
      </nav>

      <div className="relative flex-1">
        <div className={cn("absolute inset-0", activeView === "editor" ? "visible" : "invisible")}>
          <Allotment defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_WIDTH]}>
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
            >
              <FileExplorer projectId={projectId} />
            </Allotment.Pane>

            <Allotment.Pane minSize={MIN_SIDEBAR_WIDTH}>
              <EditorView projectId={projectId} />
            </Allotment.Pane>
          </Allotment>
        </div>

        <div className={cn("absolute inset-0", activeView === "preview" ? "visible" : "invisible")}>
          <PreviewView projectId={projectId} />
        </div>
      </div>
    </div>
  );
};
