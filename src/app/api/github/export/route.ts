import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";

const requestSchema = z.object({
  projectId: z.string(),
  repoName: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().max(350).optional(),
});

export async function POST(request: Request) {
  const { userId, has } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const hasPro = has({ plan: "pro" });
  
    if (!hasPro) {
      return NextResponse.json(
        { error: "Pro Plan required to export GitHub repositories." },
        { status: 403 }
      );
    }

  const body = await request.json();
  const { projectId, repoName, visibility, description } = requestSchema.parse(body);

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");
  const githubToken = tokens.data[0]?.token;

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub token not found. Please reconnect your GitHub account." },
      { status: 400 }
    );
  }

  const internalKey = process.env.MUSE_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json({ error: "Internal key not found" }, { status: 500 });
  }

  const ownerId = await convex.query(api.system.getProjectOwner, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const event = await inngest.send({
    name: "github/export.repo",
    data: {
      projectId,
      repoName,
      visibility,
      description,
      githubToken,
    },
  });

  return NextResponse.json({
    success: true,
    projectId,
    eventId: event.ids[0],
  });
}
