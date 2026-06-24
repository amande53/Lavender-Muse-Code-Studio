"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";

export default function Home() {
  const projects = useQuery(api.projects.get);
  const createProject = useMutation(api.projects.create);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateProject = async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      await createProject({
        name: "New Project",
      });
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create project"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button
        disabled={isCreating}
        onClick={handleCreateProject}
      >
        {isCreating ? "Adding..." : "Add New"}
      </Button>

      {createError ? (
        <p className="text-sm text-destructive" role="alert">
          {createError}
        </p>
      ) : null}

      {projects?.map((project: Doc<"projects">) => (
        <div
          className="border rounded p-2 flex flex-col"
          key={project._id}
        >
          <p>{project.name}</p>
          <p>Owner Id: {project.ownerId}</p>
        </div>
      ))}
    </div>
  );
}
