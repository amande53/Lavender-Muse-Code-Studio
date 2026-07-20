import { OptimisticLocalStore } from "convex/browser";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";

// Sort: folders first, then files, then alphabetically by name
const sortFiles = <T extends { type: "file" | "folder"; name: string }>(
  files: T[]
): T[] => {
  return [...files].sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1;
    if (a.type === "file" && b.type === "folder") return 1;
    return a.name.localeCompare(b.name);
  })
};

// Defined outside the hooks (not as inline closures) so `Date.now()` /
// `crypto.randomUUID()` aren't reachable from a hook body - they run at
// mutation-call time, not render time, but the react-hooks/purity rule
// can't tell the difference for closures nested inside a `use*` function.
const applyUpdateFileOptimistically = (
  localStore: OptimisticLocalStore,
  args: { id: Id<"files">; content: string }
) => {
  const existingFile = localStore.getQuery(api.files.getFile, { id: args.id });

  if (existingFile) {
    localStore.setQuery(
      api.files.getFile,
      { id: args.id },
      { ...existingFile, content: args.content, updatedAt: Date.now() }
    );
  }
};

const applyCreateFileOptimistically = (
  localStore: OptimisticLocalStore,
  args: { projectId: Id<"projects">; parentId?: Id<"files">; name: string; content: string }
) => {
  const existingFiles = localStore.getQuery(api.files.getFolderContents, {
    projectId: args.projectId,
    parentId: args.parentId,
  });

  if (existingFiles !== undefined) {
    const now = Date.now();
    const newFile: Doc<"files"> = {
      _id: crypto.randomUUID() as Id<"files">,
      _creationTime: now,
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      content: args.content,
      type: "file",
      updatedAt: now,
    };

    localStore.setQuery(
      api.files.getFolderContents,
      { projectId: args.projectId, parentId: args.parentId },
      sortFiles([...existingFiles, newFile])
    );
  }
};

const applyCreateFolderOptimistically = (
  localStore: OptimisticLocalStore,
  args: { projectId: Id<"projects">; parentId?: Id<"files">; name: string }
) => {
  const existingFiles = localStore.getQuery(api.files.getFolderContents, {
    projectId: args.projectId,
    parentId: args.parentId,
  });

  if (existingFiles !== undefined) {
    const now = Date.now();
    const newFolder: Doc<"files"> = {
      _id: crypto.randomUUID() as Id<"files">,
      _creationTime: now,
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "folder",
      updatedAt: now,
    };

    localStore.setQuery(
      api.files.getFolderContents,
      { projectId: args.projectId, parentId: args.parentId },
      sortFiles([...existingFiles, newFolder])
    );
  }
};

export const useFiles = (projectId: Id<"projects"> | null) => { 
  return useQuery(api.files.getFiles, projectId ? { projectId } : "skip")
}

export const useFile = (fileId: Id<"files"> | null) => { 
  return useQuery(api.files.getFile, fileId ? {id: fileId} : "skip")
}

export const useUpdateFile = () => {
  return useMutation(api.files.updateFile).withOptimisticUpdate(applyUpdateFileOptimistically);
};

export const useCreateFile = () => {
  return useMutation(api.files.createFile).withOptimisticUpdate(applyCreateFileOptimistically);
}

export const useFilePath = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFilePath, fileId ? { id: fileId } : "skip");
}

export const useCreateFolder = () => {
  return useMutation(api.files.createFolder).withOptimisticUpdate(
    applyCreateFolderOptimistically
  );
};

export const useRenameFile = ({
  projectId, 
  parentId
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}) => {
  return useMutation(api.files.renameFile).withOptimisticUpdate(
    (localStore, args) => { 
      const existingFiles = localStore.getQuery(api.files.getFolderContents, {
        projectId, 
        parentId,
      })

      if (existingFiles !== undefined) { 
        const updateFiles = existingFiles.map((file) =>
          file._id === args.id ? { ...file, name: args.newName } : file
        )

        localStore.setQuery(
          api.files.getFolderContents,
          { projectId, parentId },
          sortFiles(updateFiles)
        )
      }      
    }
  )
};

export const useDeleteFile = ({
  projectId,
  parentId,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}) => {
  return useMutation(api.files.deleteFile).withOptimisticUpdate(
    (localStore, args) => { 
      const existingFiles = localStore.getQuery(api.files.getFolderContents, {
        projectId,
        parentId,
      });

      if (existingFiles !== undefined) {
        localStore.setQuery(
          api.files.getFolderContents,
          { projectId, parentId },
          existingFiles.filter((file) => file._id !== args.id)
        );
      }
    }
  );
};

export const useFolderContents = ({
  projectId,
  parentId,
  enabled = true,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files"> | null;
  enabled?: boolean;
}) => {
  return useQuery(
    api.files.getFolderContents,
    enabled ? { projectId, parentId: parentId ?? undefined } : "skip"
  );
};
