import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { getAllAgentsForUser } from "@/lib/db/agents"
import { resolveModelId } from "@/lib/models"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const maxDuration = 60

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const NO_EMOJI_SYSTEM_PROMPT =
  "You are Vera, an AI assistant for auditors and professional services teams. Keep all responses precise and professional. Do not use emoji characters unless explicitly requested by the user."

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [agents, profileResult] = await Promise.all([
    getAllAgentsForUser(user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ])

  const fullName =
    profileResult.data?.full_name ?? user.email?.split("@")[0] ?? "User"

  return Response.json({
    userName: fullName,
    agents,
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { messages, model } = body as {
    messages: ChatMessage[]
    model?: string
  }

  if (!messages?.length) {
    return new Response("Bad request", { status: 400 })
  }

  const stream = anthropic.messages.stream({
    model: resolveModelId(model),
    max_tokens: 8192,
    system: NO_EMOJI_SYSTEM_PROMPT,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  })
}
