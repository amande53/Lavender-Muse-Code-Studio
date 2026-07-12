import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
});

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId } = requestSchema.parse(body);

  const internalKey = process.env.MUSE_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json({ error: "Internal key not found" }, { status: 500 });
  }

  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  //  Find all processing messages in this project
  const processingMessages = await convex.query(api.system.getProcessingMessages, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (processingMessages.length === 0) {
    return NextResponse.json({ success: true, cancelled: false });
  }

  const cancelledIds: Id<"messages">[] = [];
  const failedIds: { messageId: Id<"messages">; error: string }[] = [];

  // Cancel all processing messages
  await Promise.all(
    processingMessages.map(async (msg: { _id: Id<"messages"> }) => {
      try {
        await inngest.send({
          name: "message/cancel",
          data: {
            messageId: msg._id,
          },
        });

        await convex.mutation(api.system.updateMessageStatus, {
          internalKey,
          messageId: msg._id,
          status: "cancelled",
        });

        cancelledIds.push(msg._id);
      } catch (error) {
        failedIds.push({
          messageId: msg._id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })
  );

  return NextResponse.json({
    success: failedIds.length === 0,
    cancelled: cancelledIds.length > 0,
    partial: failedIds.length > 0,
    messageId: cancelledIds,
    failed: failedIds,
  });
}
