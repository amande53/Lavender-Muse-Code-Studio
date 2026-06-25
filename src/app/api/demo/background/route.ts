//POST localhost:3000/api/demo/blocking

import { inngest } from "@/src/inngest/client"

export async function POST() {
  await inngest.send({
    name: "demo/generate",
    data: {},
  })
  return Response.json({ status: "started" })
}
