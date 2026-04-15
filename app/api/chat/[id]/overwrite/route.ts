import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

type OverwriteBody = {
  sourceMessageId: string
  assistantMessageId?: string
  sourceContent?: string
  content: string
}

const PENDING_ASSISTANT_CONTENT = "__vera_pending_response__"

function stripMessageIdSuffix(id: string): string {
  return id.replace(/:(user|assistant)$/, "")
}

async function resolveCanonicalTurnKey({
  supabase,
  chatId,
  userId,
  sourceMessageId,
  sourceContent,
}: {
  supabase: ReturnType<typeof createServiceClient>
  chatId: string
  userId: string
  sourceMessageId: string
  sourceContent?: string
}): Promise<string> {
  const stripped = stripMessageIdSuffix(sourceMessageId.trim())
  if (!stripped) return sourceMessageId

  const { data: userMessageById } = await supabase
    .from("messages")
    .select("id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .eq("role", "user")
    .eq("id", stripped)
    .maybeSingle()

  if (userMessageById?.id) {
    return userMessageById.id
  }

  const { data: turnPairByKey } = await supabase
    .from("chat_turn_pairs")
    .select("turn_key")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .eq("turn_key", stripped)
    .maybeSingle()

  if (turnPairByKey?.turn_key) {
    return turnPairByKey.turn_key
  }

  const normalizedSourceContent = sourceContent?.trim()
  if (!normalizedSourceContent) {
    return stripped
  }

  const { data: turnPairByContent } = await supabase
    .from("chat_turn_pairs")
    .select("turn_key")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .eq("user_content", normalizedSourceContent)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return turnPairByContent?.turn_key ?? stripped
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: chat } = await supabase
    .from("chats")
    .select("id, user_id")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!chat) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  let body: OverwriteBody
  try {
    body = (await req.json()) as OverwriteBody
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 })
  }

  const sourceMessageId = stripMessageIdSuffix(
    body.sourceMessageId?.trim() ?? ""
  )
  const sourceContent = body.sourceContent?.trim()
  const assistantMessageId = body.assistantMessageId?.trim()
  const content = body.content?.trim()

  if (!sourceMessageId || !content) {
    return Response.json(
      { error: "Invalid overwrite payload" },
      { status: 400 }
    )
  }

  const serviceSupabase = createServiceClient()
  const turnKey = await resolveCanonicalTurnKey({
    supabase: serviceSupabase,
    chatId: chat.id,
    userId: user.id,
    sourceMessageId,
    sourceContent,
  })
  let resolvedTurnKey = turnKey

  const { data: userMessage } = await serviceSupabase
    .from("messages")
    .select("id")
    .eq("id", turnKey)
    .eq("chat_id", chat.id)
    .eq("user_id", user.id)
    .eq("role", "user")
    .maybeSingle()

  if (userMessage?.id) {
    const { error: userUpdateError } = await serviceSupabase
      .from("messages")
      .update({
        content,
        parts: [{ type: "text", text: content }],
      })
      .eq("id", turnKey)
      .eq("chat_id", chat.id)
      .eq("user_id", user.id)
      .eq("role", "user")

    if (userUpdateError) {
      return Response.json(
        { error: "Failed to overwrite user message" },
        { status: 500 }
      )
    }
  } else if (sourceContent) {
    // When chats are hydrated from turn pairs, UI message IDs can be synthetic.
    // If we cannot update by turn key, reconcile the latest legacy user row by
    // source content so refresh does not resurrect stale pre-overwrite text.
    const { data: sourceUserMessage } = await serviceSupabase
      .from("messages")
      .select("id")
      .eq("chat_id", chat.id)
      .eq("user_id", user.id)
      .eq("role", "user")
      .eq("content", sourceContent)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sourceUserMessage?.id) {
      const { error: sourceUpdateError } = await serviceSupabase
        .from("messages")
        .update({
          content,
          parts: [{ type: "text", text: content }],
        })
        .eq("id", sourceUserMessage.id)
        .eq("chat_id", chat.id)
        .eq("user_id", user.id)
        .eq("role", "user")

      if (sourceUpdateError) {
        return Response.json(
          { error: "Failed to reconcile source message" },
          { status: 500 }
        )
      }

      resolvedTurnKey = sourceUserMessage.id
    }
  }

  if (assistantMessageId) {
    await serviceSupabase
      .from("messages")
      .delete()
      .eq("id", assistantMessageId)
      .eq("chat_id", chat.id)
      .eq("user_id", user.id)
      .eq("role", "assistant")
  }

  await serviceSupabase.from("chat_turn_pairs").upsert(
    {
      chat_id: chat.id,
      user_id: user.id,
      turn_key: resolvedTurnKey,
      user_content: content,
      assistant_content: PENDING_ASSISTANT_CONTENT,
      user_parts: [{ type: "text", text: content }],
    },
    {
      onConflict: "chat_id,user_id,turn_key",
    }
  )

  return Response.json({ ok: true })
}
