import { OptimisticLocalStore } from "convex/browser";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

export const useConversation = (id: Id<"conversations"> | null) => {
  return useQuery(api.conversations.getById, id ? { id } : "skip");
};

export const useMessages = (conversationId: Id<"conversations"> | null) => {
  return useQuery(api.conversations.getMessages, conversationId ? { conversationId } : "skip");
};

export const useConversations = (projectId: Id<"projects">) => {
  return useQuery(api.conversations.getByProject, { projectId });
};

// Defined outside the hook (not as an inline closure) so `Date.now()` /
// `crypto.randomUUID()` aren't reachable from a hook body - they run at
// mutation-call time, not render time, but the react-hooks/purity rule
// can't tell the difference for closures nested inside a `use*` function.
const applyCreateConversationOptimistically = (
  localStore: OptimisticLocalStore,
  args: { projectId: Id<"projects">; title: string }
) => {
  const existingConversations = localStore.getQuery(api.conversations.getByProject, {
    projectId: args.projectId,
  });

  if (existingConversations !== undefined) {
    const now = Date.now();
    const newConversation: Doc<"conversations"> = {
      _id: crypto.randomUUID() as Id<"conversations">,
      _creationTime: now,
      projectId: args.projectId,
      title: args.title,
      updatedAt: now,
    };

    localStore.setQuery(api.conversations.getByProject, { projectId: args.projectId }, [
      newConversation,
      ...existingConversations,
    ]);
  }
};

export const useCreateConversation = () => {
  return useMutation(api.conversations.create).withOptimisticUpdate(
    applyCreateConversationOptimistically
  );
};
