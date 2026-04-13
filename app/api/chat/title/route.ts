import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { resolveModelId } from "@/lib/models"
import { createServiceClient } from "@/lib/supabase/service"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const maxDuration = 30
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.VERA_DEV_BYPASS_AUTH === "true"

type TitleRequest = {
  seed?: string
  chatId?: string
}

function cleanTitle(raw: string): string {
  const singleLine = raw
    .replace(/[\r\n]+/g, " ")
    .replace(/^"|"$/g, "")
    .trim()
  if (!singleLine) return "Untitled"
  return singleLine.length > 56
    ? `${singleLine.slice(0, 56).trimEnd()}...`
    : singleLine
}

export async function POST(req: Request) {
  const debugUserId = req.headers.get("x-vera-debug-user-id")?.trim() || null
  const sessionSupabase = await createClient()
  const bypassSupabase = DEV_AUTH_BYPASS ? createServiceClient() : null
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser()

  const isBypass = !user && !!bypassSupabase
  const supabase = bypassSupabase ?? sessionSupabase

  if (!user && !isBypass) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await req.json()) as TitleRequest
  const seed = body.seed?.trim() ?? ""
  const chatId = body.chatId?.trim() ?? ""

  if (!seed) {
    return Response.json({ title: "Untitled" })
  }

  try {
    const response = await anthropic.messages.create({
      model: resolveModelId("claude-haiku-4-5"),
      max_tokens: 32,
      system:
        "Generate concise professional chat titles for audit workflows. Return only the title text. Do not use emojis, punctuation at end, quotes, or markdown.",
      messages: [
        {
          role: "user",
          content: `Create a short chat title (3-7 words) from this conversation context:\n\n${seed}`,
        },
      ],
    })

    const raw = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")

    const title = cleanTitle(raw)

    if (chatId) {
      const chatLookup = supabase
        .from("chats")
        .select("title, user_id")
        .eq("id", chatId)
      const { data: chat } =
        isBypass && !debugUserId
          ? await chatLookup.single()
          : await chatLookup
              .eq("user_id", user?.id ?? debugUserId ?? "")
              .single()

      const currentTitle = chat?.title?.trim() ?? ""
      const isPlaceholder =
        !currentTitle ||
        currentTitle === "New chat" ||
        currentTitle === "Untitled"

      if (isPlaceholder) {
        const titleUpdate = supabase
          .from("chats")
          .update({ title })
          .eq("id", chatId)
        if (isBypass && !debugUserId) {
          await titleUpdate
        } else {
          await titleUpdate.eq("user_id", user?.id ?? debugUserId ?? "")
        }
      }
    }

    return Response.json({ title })
  } catch {
    return Response.json({ title: "Untitled" })
  }
}
