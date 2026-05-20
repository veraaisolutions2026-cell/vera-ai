import { streamText } from "ai"
import { createClient } from "@/lib/supabase/server"
import { getAllAgentsForUser } from "@/lib/db/agents"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { resolveGatewayModelId, resolveModelId } from "@/lib/models"
import { resolveAnthropicLanguageModel } from "@/lib/ai-provider"

export const maxDuration = 60

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

const NO_EMOJI_SYSTEM_PROMPT =
  "You are Vera, an AI assistant for auditors and professional services teams. Keep all responses precise and professional. Do not use emoji characters unless explicitly requested by the user. Do not use em dashes (\u2014) or en dashes (\u2013); use a comma, colon, or rewrite the sentence instead."

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [profileResult, layerAccess] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getUserLayerAccess(user.id),
  ])

  const agents = await getAllAgentsForUser(user.id, layerAccess.layer)

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

  const directModelId = resolveModelId(model)
  const gatewayModelId = resolveGatewayModelId(model)
  const languageModel = resolveAnthropicLanguageModel({
    directModelId,
    gatewayModelId,
  })

  const result = streamText({
    model: languageModel,
    maxOutputTokens: 8192,
    system: NO_EMOJI_SYSTEM_PROMPT,
    messages,
    abortSignal: req.signal,
  })

  return result.toTextStreamResponse({
    headers: {
      "X-Accel-Buffering": "no",
      "Cache-Control": "no-cache",
    },
  })
}
