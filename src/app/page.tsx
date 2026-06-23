"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";

export default function Home() {
  const projects = useQuery(api.projects.get);
  const createProject = useMutation(api.projects.create);

  return (
    <div className="flex flex-col gap-2 p-4">
      <Button
        onClick={() =>
          createProject({
            name: "New Project",
          })
        }
      >
        Add New
      </Button>

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
