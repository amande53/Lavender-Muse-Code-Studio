import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export const useFiles = (projectId: Id<"projects"> | null) => { 
  return useQuery(api.files.getFiles, projectId ? { projectId } : "skip")
}

export const useFile = (fileId: Id<"files"> | null) => { 
  return useQuery(api.files.getFile, fileId ? {id: fileId} : "skip")
}

export const useUpdateFile = () => {
  return useMutation(api.files.updateFile);
};
export const useCreateFile = () => {
  return useMutation(api.files.createFile);
  //TODO: Add optimistic mutation
}

export const useFilePath = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFilePath, fileId ? { id: fileId } : "skip");
  //TODO: Add optimistic mutation
}

export const useCreateFolder = () => {
  return useMutation(api.files.createFolder);
  //TODO: Add optimistic mutation
};

export const useRenameFile = () => {
  return useMutation(api.files.renameFile);
};

export const useDeleteFile = () => {
  return useMutation(api.files.deleteFile);
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
