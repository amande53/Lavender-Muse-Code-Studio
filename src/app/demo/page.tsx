"use client"
import * as Sentry from "@sentry/nextjs"
import { Button } from "@/components/ui/button"
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

export default function DemoPage() {
const userId = useAuth()

const [loading, setLoading] = useState(false)
const [loading2, setLoading2] = useState(false)

  const handleBlocking = async () => {
    setLoading(true)
    await fetch("/api/demo/blocking", { method: "POST" })
    setLoading(false)
  }

   const handleBackground = async () => {
     setLoading2(true);
     await fetch("/api/demo/background", { method: "POST" });
     setLoading2(false);
   };
  
  // 1) client error - throws in browser
  const handleClientError = () => {
    Sentry.logger.info("User attempting to click on client function", { userId })
    throw new Error("Client error: Something went wrong in the browser!")
  }

  // 2) API error - triggers server-side error
  const handleApiError = async () => {
    await fetch("/api/error", { method: "POST" })
  }

  // 3) Inngest error - triggers error in background job
  const handleInngestError = async () => {
    await fetch("/api/demo/inngest-error", { method: "POST" })
  }

  return (
    <div className="p-8 space-x-4">
      <Button disabled={loading} onClick={handleBlocking}>
        {loading ? "Loading..." : "Blocking"}
      </Button>
      <Button disabled={loading2} onClick={handleBackground}>
        {loading2 ? "Loading..." : "background"}
      </Button>
      <Button
      onClick={handleClientError}
      variant="destructive"
      >
        Client Error
      </Button>
      <Button
      onClick={handleApiError}
      variant="destructive"
      >
        API Error
      </Button>
      <Button
      onClick={handleInngestError}
      variant="destructive"
      >
        Inngest Error
      </Button>
    </div>
  )
}
