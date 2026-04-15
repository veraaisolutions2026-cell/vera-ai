import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Message } from "@/types/database"
import type { Json } from "@/types/supabase"
import type { PersistedMessageParts } from "@/lib/chat-attachments"

const PENDING_ASSISTANT_CONTENT = "__vera_pending_response__"
const LEGACY_PENDING_ASSISTANT_CONTENT = "__PENDING__"

function isPendingAssistantContent(value: string | null | undefined): boolean {
  return (
    value === PENDING_ASSISTANT_CONTENT ||
    value === LEGACY_PENDING_ASSISTANT_CONTENT
  )
}

export async function getMessages(
  chatId: string,
  userId: string
): Promise<Message[]> {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const [
    { data: messageRows, error: messageError },
    { data: pairRows, error: pairError },
  ] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    serviceSupabase
      .from("chat_turn_pairs")
      .select("*")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ])

  const legacyMessages = (messageRows as Message[]) ?? []
  const turnPairs = (pairRows ?? []).filter(
    (pair) => !isPendingAssistantContent(pair.assistant_content)
  )

  if ((messageError || pairError) && !turnPairs.length) return []

  if (!turnPairs.length) {
    return legacyMessages
  }

  const pairedMessages: Message[] = turnPairs.flatMap((pair) => [
    {
      id: `${pair.turn_key}:user`,
      chat_id: pair.chat_id,
      user_id: pair.user_id,
      role: "user",
      content: pair.user_content,
      created_at: pair.created_at,
      parts: pair.user_parts ?? null,
    },
    {
      id: `${pair.turn_key}:assistant`,
      chat_id: pair.chat_id,
      user_id: pair.user_id,
      role: "assistant",
      content: pair.assistant_content,
      created_at: pair.created_at,
      parts: null,
    },
  ])

  const lastPairCreatedAt = turnPairs[turnPairs.length - 1]?.created_at
  const beforePairs = lastPairCreatedAt
    ? legacyMessages.filter(
        (message) => message.created_at <= lastPairCreatedAt
      )
    : legacyMessages
  const afterPairs = lastPairCreatedAt
    ? legacyMessages.filter((message) => message.created_at > lastPairCreatedAt)
    : []

  const legacySignatures = beforePairs.map(
    (message) => `${message.role}:${message.content}`
  )
  const pairedSignatures = pairedMessages.map(
    (message) => `${message.role}:${message.content}`
  )
  const pairedSignatureSet = new Set(pairedSignatures)

  let overlap = 0
  const maxOverlap = Math.min(legacyMessages.length, pairedMessages.length)
  for (let length = maxOverlap; length >= 1; length -= 1) {
    const legacyTail = legacySignatures.slice(-length)
    const pairedHead = pairedSignatures.slice(0, length)

    if (legacyTail.join("\u0000") === pairedHead.join("\u0000")) {
      overlap = length
      break
    }
  }

  if (!legacyMessages.length) {
    return pairedMessages
  }

  const dedupedBeforePairs = beforePairs.filter(
    (message) => !pairedSignatureSet.has(`${message.role}:${message.content}`)
  )
  const dedupedAfterPairs = afterPairs.filter(
    (message) => !pairedSignatureSet.has(`${message.role}:${message.content}`)
  )

  return [
    ...dedupedBeforePairs.slice(0, dedupedBeforePairs.length - overlap),
    ...pairedMessages,
    ...dedupedAfterPairs,
  ]
}

export async function createMessage(
  chatId: string,
  userId: string,
  role: "user" | "assistant",
  content: string,
  options?: { parts?: PersistedMessageParts }
): Promise<Message | null> {
  const supabase = await createClient()
  const payload = {
    chat_id: chatId,
    user_id: userId,
    role,
    content,
    parts: (options?.parts ?? null) as Json | null,
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select()
    .single()

  if (error && options?.parts) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, user_id: userId, role, content })
      .select()
      .single()

    if (fallbackError) return null
    return fallbackData as Message
  }

  if (error) return null
  return data as Message
}
