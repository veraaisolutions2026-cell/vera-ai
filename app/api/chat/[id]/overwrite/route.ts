import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

type OverwriteBody = {
  sourceMessageId: string
  assistantMessageId?: string
  sourceContent?: string
  sourceAssistantContent?: string
  content: string
}

const PENDING_ASSISTANT_CONTENT = "__vera_pending_response__"
const LEGACY_PENDING_ASSISTANT_CONTENT = "__PENDING__"
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.VERA_DEV_BYPASS_AUTH === "true"

function stripMessageIdSuffix(id: string): string {
  return id.replace(/:(user|assistant)$/, "")
}

async function resolveCanonicalTurnKey({
  supabase,
  chatId,
  userId,
  sourceMessageId,
  assistantMessageId,
  sourceContent,
  sourceAssistantContent,
}: {
  supabase: ReturnType<typeof createServiceClient>
  chatId: string
  userId: string
  sourceMessageId: string
  assistantMessageId?: string
  sourceContent?: string
  sourceAssistantContent?: string
}): Promise<string | null> {
  const stripped = stripMessageIdSuffix(sourceMessageId.trim())
  if (!stripped) return null

  const strippedAssistantMessageId = assistantMessageId
    ? stripMessageIdSuffix(assistantMessageId.trim())
    : ""

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

  if (strippedAssistantMessageId) {
    const { data: turnPairByAssistantKey } = await supabase
      .from("chat_turn_pairs")
      .select("turn_key")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .eq("turn_key", strippedAssistantMessageId)
      .maybeSingle()

    if (turnPairByAssistantKey?.turn_key) {
      return turnPairByAssistantKey.turn_key
    }
  }

  const normalizedSourceContent = sourceContent?.trim()
  if (normalizedSourceContent) {
    const { data: turnPairByContent } = await supabase
      .from("chat_turn_pairs")
      .select("turn_key")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .eq("user_content", normalizedSourceContent)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (turnPairByContent?.turn_key) {
      return turnPairByContent.turn_key
    }
  }

  const normalizedSourceAssistantContent = sourceAssistantContent?.trim()
  if (normalizedSourceAssistantContent) {
    const { data: turnPairByAssistantContent } = await supabase
      .from("chat_turn_pairs")
      .select("turn_key")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .eq("assistant_content", normalizedSourceAssistantContent)
      .neq("assistant_content", PENDING_ASSISTANT_CONTENT)
      .neq("assistant_content", LEGACY_PENDING_ASSISTANT_CONTENT)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (turnPairByAssistantContent?.turn_key) {
      return turnPairByAssistantContent.turn_key
    }
  }

  return null
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params
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

  const chat = isBypass
    ? await supabase
        .from("chats")
        .select("id, user_id")
        .eq("id", chatId)
        .maybeSingle()
        .then((r) => r.data)
    : await supabase
        .from("chats")
        .select("id, user_id")
        .eq("id", chatId)
        .eq("user_id", user!.id)
        .maybeSingle()
        .then((r) => r.data)

  if (!chat) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const userId = user?.id ?? debugUserId ?? chat.user_id

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
  const sourceAssistantContent = body.sourceAssistantContent?.trim()
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
    userId,
    sourceMessageId,
    assistantMessageId,
    sourceContent,
    sourceAssistantContent,
  })

  if (!turnKey) {
    return Response.json(
      { error: "Could not resolve message turn for overwrite" },
      { status: 409 }
    )
  }

  let resolvedTurnKey = turnKey

  const { data: userMessage } = await serviceSupabase
    .from("messages")
    .select("id")
    .eq("id", turnKey)
    .eq("chat_id", chat.id)
    .eq("user_id", userId)
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
      .eq("user_id", userId)
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
      .eq("user_id", userId)
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
        .eq("user_id", userId)
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
      .eq("user_id", userId)
      .eq("role", "assistant")
  }

  // ── Purge subsequent turns ────────────────────────────────────
  // When a mid-conversation message is edited, all turns that came AFTER the
  // edited one are invalidated (they were based on the old context). Delete
  // them from both chat_turn_pairs and messages so they don't reappear on
  // page reload.
  //
  // We look up the ORIGINAL turn pair by sourceContent BEFORE the upsert,
  // because the upsert would give it a fresh created_at ("now") which breaks
  // the timestamp comparison.
  if (sourceContent) {
    const { data: originalPair } = await serviceSupabase
      .from("chat_turn_pairs")
      .select("created_at")
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .eq("user_content", sourceContent)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (originalPair?.created_at) {
      await serviceSupabase
        .from("chat_turn_pairs")
        .delete()
        .eq("chat_id", chat.id)
        .eq("user_id", userId)
        .gt("created_at", originalPair.created_at)
    }
  }

  // Purge messages created after the edited user message.
  const { data: editedUserRow } = await serviceSupabase
    .from("messages")
    .select("created_at")
    .eq("chat_id", chat.id)
    .eq("user_id", userId)
    .eq("id", resolvedTurnKey)
    .maybeSingle()

  if (editedUserRow?.created_at) {
    await serviceSupabase
      .from("messages")
      .delete()
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .gt("created_at", editedUserRow.created_at)
  }

  // Now upsert the pending pair for the edited turn.
  await serviceSupabase.from("chat_turn_pairs").upsert(
    {
      chat_id: chat.id,
      user_id: userId,
      turn_key: resolvedTurnKey,
      user_content: content,
      assistant_content: PENDING_ASSISTANT_CONTENT,
      user_parts: [{ type: "text", text: content }],
    },
    {
      onConflict: "chat_id,user_id,turn_key",
    }
  )

  // When resolvedTurnKey diverges from the original turnKey (e.g. the overwrite
  // found the message row by content rather than by the turn pair's key), the
  // original turn pair becomes stale and must be cleaned up.
  const staleTurnKeyCandidates = [
    sourceMessageId,
    stripMessageIdSuffix(assistantMessageId ?? ""),
    turnKey,
  ].filter((candidate) => Boolean(candidate) && candidate !== resolvedTurnKey)

  if (staleTurnKeyCandidates.length) {
    await serviceSupabase
      .from("chat_turn_pairs")
      .delete()
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .in("turn_key", staleTurnKeyCandidates)
  }

  return Response.json({ ok: true })
}
