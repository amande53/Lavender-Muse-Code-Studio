import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@/convex/_generated/api";
import {inngest } from"@/inngest/client"
import {convex} from "@/lib/convex-client";
import { generateRandomName } from "@/lib/generate-name";

const requestSchema = z.object({
  prompt: z.string().min(1,),
})

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) { 
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.MUSE_CONVEX_INTERNAL_KEY

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not set" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { prompt } = requestSchema.parse(body);

  //Generate a random name for the project
  const projectName = generateRandomName(3);

  // Create project and coversation together
  const { projectId, conversationId } = await convex.mutation(
    api.system.createProjectWithConversation,
    {
      internalKey,
      projectName,
      ownerId: userId,
      conversationTitle: projectName,
    },
  )

  // Create user message
  await convex.mutation(api.system.createMessage, {
    internalKey,
    conversationId,
    projectId,
    role: "user",
    content: prompt,
  })

  // Create assistant message placeholder with processing status
  const assistantMessageId = await convex.mutation(
    api.system.createMessage,
    {
      internalKey,
      conversationId,
      projectId,
      role: "assistant",
      content: "",
      status: "processing",
    },
  )

  // Trigger Inngest to process the message

  await inngest.send({
    name: "message/sent",
    data: {
      messageId: assistantMessageId,
      conversationId,
      projectId,
      message: prompt,
    }
  })

  return NextResponse.json({projectId})

}