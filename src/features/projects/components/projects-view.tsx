"use client";

// React
import { useEffect, useState } from "react";

// Fonts
import { Poppins } from "next/font/google";

// Icons
import { FaGithub } from "react-icons/fa";
import { SparkleIcon } from "lucide-react";

// UI components
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ProjectsCommandDialog } from "./projects-command-dialog"
import { ProjectsList } from "@/features/projects/components/projects-list";

// Project data
import { useCreateProject } from "@/features/projects/hooks/use-projects";

// Utilities
import { generateRandomName } from "@/lib/generate-name";
import { cn } from "@/lib/utils";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const ProjectsView = () => {
  const createProject = useCreateProject();

  const [commandDialogOpen, setCommandDialogOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k") {
          e.preventDefault()
          setCommandDialogOpen((current) => !current)
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])


  return (
    <>
      <ProjectsCommandDialog
      open={commandDialogOpen}
      onOpenChange={setCommandDialogOpen}
      />
    <div className="min-h-screen bg-sidebar flex flex-col items-center justify-center p-6 md:p-16">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">
        <div className="flex justify-between gap-4 w-full items-center"></div>

        <div className="flex items-center gap-2 w-full group/logo">
          <img
            src="/lavender-muse-code-logo.png"
            alt="Lavender Muse Code logo"
            className="size-[32px] md:size-[46px]"
          />
          <h1 className={cn("text-4xl md:text-5xl font-semibold", font.className)}>
            Lavender Muse Code
          </h1>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const projectName = generateRandomName(3);
                createProject({
                  name: projectName,
                });
              }}
              className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none hover:text-foreground text-foreground/60"
            >
              <div className="flex items-center justify-between w-full">
                <SparkleIcon className="size-4" />
                <Kbd className="border">⌘J</Kbd>
              </div>
              <div>
                <span className="text-sm">New</span>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              className="h-full items-start text-foreground/60 justify-start p-4 bg-background border flex flex-col gap-6 rounded-none hover:text-foreground"
            >
              <div className="flex items-center justify-between w-full">
                <FaGithub className="size-4" />
                <Kbd className="border">⌘I</Kbd>
              </div>
              <div>
                <span className="text-sm">Import</span>
              </div>
            </Button>
          </div>
            <ProjectsList onViewAll={() => setCommandDialogOpen(true)} />
        </div>
      </div>
    </div>
    </>
  );
};
