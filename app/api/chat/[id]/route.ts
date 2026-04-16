import { revalidatePath } from "next/cache"
import { anthropic } from "@ai-sdk/anthropic"
import { devToolsMiddleware } from "@ai-sdk/devtools"
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  wrapLanguageModel,
  type UIMessage,
} from "ai"
import {
  CHAT_ATTACHMENTS_BUCKET,
  getVeraAttachmentMetadata,
  toPersistedMessageParts,
  type PersistedFilePart,
} from "@/lib/chat-attachments"
import { createClient } from "@/lib/supabase/server"
import { getAgent } from "@/lib/db/agents"
import { getChat } from "@/lib/db/chats"
import { createMessage } from "@/lib/db/messages"
import { resolveModelId, supportsReasoningForModel } from "@/lib/models"
import { createServiceClient } from "@/lib/supabase/service"
import { recordUsageEvent } from "@/lib/db/usage-events"
import { getUsageAvailability } from "@/lib/db/usage-limits"
import type { Json } from "@/types/supabase"

export const maxDuration = 60

const STREAM_RESPONSE_HEADERS = {
  "Transfer-Encoding": "chunked",
  Connection: "keep-alive",
  "Content-Encoding": "none",
} as const

const PENDING_ASSISTANT_CONTENT = "__vera_pending_response__"
const LEGACY_PENDING_ASSISTANT_CONTENT = "__PENDING__"
const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.VERA_DEV_BYPASS_AUTH === "true"
const AI_DEVTOOLS_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.VERA_ENABLE_AI_DEVTOOLS !== "false"

const NO_EMOJI_SUFFIX =
  "\n\nIMPORTANT: Never use emoji characters in your responses. Use clear, professional language only."

const DEFAULT_SYSTEM_PROMPT = `You are Vera, an AI assistant built for auditors and professional services teams. You help with audit analysis, workpaper review, risk assessment, financial disclosure drafting, compliance checking, and related professional tasks. Keep responses precise and professional. If asked who you are, introduce yourself as Vera - do not mention Claude, Anthropic, or any other AI product.`

function isPendingAssistantContent(value: string | null | undefined): boolean {
  return (
    value === PENDING_ASSISTANT_CONTENT ||
    value === LEGACY_PENDING_ASSISTANT_CONTENT
  )
}

type ChatRequestBody = {
  messages?: UIMessage[]
  trigger?: "submit-message" | "regenerate-message" | "resume-stream"
  messageId?: string
}

function getTextFromParts(parts: UIMessage["parts"]): string {
  let text = ""

  for (const part of parts) {
    if (part.type === "text") {
      text += part.text
    }
  }

  return text
}

function isChatRole(role: UIMessage["role"]): role is "user" | "assistant" {
  return role === "user" || role === "assistant"
}

function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== "user") continue
    const content = getTextFromParts(message.parts).trim()
    if (content) return content
  }

  return ""
}

function getLastUserMessage(messages: UIMessage[]): UIMessage | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role === "user") {
      return message
    }
  }

  return null
}

function getLastUserTurn(messages: UIMessage[]): {
  turnKey: string
  text: string
} | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message?.role !== "user") continue
    const content = getTextFromParts(message.parts).trim()
    if (!content) continue

    const messageId = message.id?.trim()
    if (messageId) {
      return { turnKey: messageId, text: content }
    }

    return {
      turnKey: `fallback-${i}-${content.slice(0, 120)}`,
      text: content,
    }
  }

  return null
}

function createEmptyTurnResponse(turnState: string): Response {
  const stream = createUIMessageStream<UIMessage>({
    execute: () => {
      // Intentionally emit no message parts. The AI SDK still wraps this in a
      // valid SSE UI-message stream and appends the final DONE event.
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers: {
      ...STREAM_RESPONSE_HEADERS,
      "x-vera-turn-state": turnState,
    },
  })
}

function createReplayTurnResponse(
  assistantText: string,
  originalMessages: UIMessage[],
  turnState: string
): Response {
  const stream = createUIMessageStream<UIMessage>({
    originalMessages,
    execute: ({ writer }) => {
      const messageId = crypto.randomUUID()
      const textPartId = crypto.randomUUID()

      writer.write({ type: "start", messageId })
      writer.write({ type: "text-start", id: textPartId })
      writer.write({ type: "text-delta", id: textPartId, delta: assistantText })
      writer.write({ type: "text-end", id: textPartId })
      writer.write({ type: "finish", finishReason: "stop" })
    },
  })

  return createUIMessageStreamResponse({
    stream,
    headers: {
      ...STREAM_RESPONSE_HEADERS,
      "x-vera-turn-state": turnState,
    },
  })
}

function createOutOfUsageResponse(
  remainingRequests: number | null,
  monthlyRequestLimit: number | null
): Response {
  return Response.json(
    {
      error: "out_of_usage",
      remainingRequests,
      monthlyRequestLimit,
    },
    {
      status: 402,
      headers: {
        "x-vera-turn-state": "out-of-usage",
      },
    }
  )
}

async function prepareMessagesForModel(
  messages: UIMessage[],
  storageClient: ReturnType<typeof createServiceClient>
): Promise<UIMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== "user") return message

      const preparedParts: UIMessage["parts"] = []

      for (const part of message.parts) {
        if (part.type !== "file") {
          preparedParts.push(part)
          continue
        }

        const metadata = getVeraAttachmentMetadata(part as PersistedFilePart)
        if (!metadata) {
          preparedParts.push(part)
          continue
        }

        if (metadata.attachmentType === "docx") {
          if (metadata.extractedText?.trim()) {
            preparedParts.push({
              type: "text",
              text: `Attached document \"${part.filename ?? "document"}\" extracted text:\n\n${metadata.extractedText}`,
            })
          }
          continue
        }

        const { data } = await storageClient.storage
          .from(CHAT_ATTACHMENTS_BUCKET)
          .createSignedUrl(metadata.storagePath, 60 * 60)

        preparedParts.push({
          ...part,
          url: data?.signedUrl ?? part.url,
        })
      }

      return { ...message, parts: preparedParts }
    })
  )
}

/*
  [x] STABLE BASELINE (DO NOT CHANGE WITHOUT DOUBLE CONFIRMATION)
  This claim + replay flow was hardened to remove stale-output/race regressions.
  Any structural changes here must be discussed with the user first.

  TURN CLAIM STRATEGY
  ---------------------------------------------------------------
  We claim a turn by inserting a sentinel row in chat_turn_pairs using the
  unique key (chat_id, user_id, turn_key). This removes dependence on chat
  metadata timestamps and keeps dedupe scoped to the actual user turn.

  - First request inserts pending sentinel and proceeds to generation.
  - Concurrent duplicates miss claim and return an empty SSE response.
  - On finish, the same row is upserted with final assistant content.
  - If generation ends without assistant text, pending sentinel is deleted so
    manual retry can claim the turn again.

  Regeneration requests are allowed to overwrite existing completed turn
  content for the same turn_key so refresh reflects the latest retry output.
*/

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
  const bookkeepingSupabase = createServiceClient()

  if (!user && !isBypass) {
    return new Response("Unauthorized", { status: 401 })
  }

  const chat = isBypass
    ? await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .maybeSingle()
        .then((r) => r.data)
    : await getChat(chatId)

  if (!chat) {
    return new Response("Not found", { status: 404 })
  }

  if (!isBypass && chat.user_id !== user!.id) {
    return new Response("Not found", { status: 404 })
  }

  const userId = user?.id ?? debugUserId ?? chat.user_id

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return createEmptyTurnResponse("invalid-payload")
  }

  const requestMessages = body.messages ?? []
  if (!requestMessages.length) {
    return createEmptyTurnResponse("empty-messages")
  }

  const lastUserTurn = getLastUserTurn(requestMessages)
  const lastUserMessage = getLastUserMessage(requestMessages)
  const lastUserPersistedParts = toPersistedMessageParts(lastUserMessage?.parts)
  if (!lastUserTurn) {
    return new Response("Bad request", { status: 400 })
  }

  const usageAvailability = await getUsageAvailability(userId)
  if (!usageAvailability.isAvailable) {
    return createOutOfUsageResponse(
      usageAvailability.remainingRequests,
      usageAvailability.monthlyRequestLimit
    )
  }

  const requestTrigger = body.trigger ?? "submit-message"
  const lastUserIndex = requestMessages
    .map((message) => message.role)
    .lastIndexOf("user")
  const isRegenerationRequest = requestTrigger === "regenerate-message"

  let generationMessages = requestMessages
  if (isRegenerationRequest && lastUserIndex >= 0) {
    // Anthropic rejects assistant-prefill tails; regeneration must end on the
    // last user turn before generating a replacement assistant response.
    generationMessages = requestMessages.slice(0, lastUserIndex + 1)
  }

  // Canonicalize to the persisted DB user message id when available so refresh
  // replays and in-flight retries resolve to the same logical turn key.
  // Strip :user/:assistant suffixes that arise from synthetic IDs in getMessages().
  const rawTurnKey = lastUserTurn.turnKey.replace(/:(user|assistant)$/, "")
  let resolvedTurnKey = rawTurnKey
  const { data: persistedUserMessageByRawId } = await supabase
    .from("messages")
    .select("id")
    .eq("chat_id", chat.id)
    .eq("user_id", userId)
    .eq("role", "user")
    .eq("id", rawTurnKey)
    .maybeSingle()

  const { data: existingTurnPairByRawKey } = await bookkeepingSupabase
    .from("chat_turn_pairs")
    .select("turn_key")
    .eq("chat_id", chat.id)
    .eq("user_id", userId)
    .eq("turn_key", rawTurnKey)
    .maybeSingle()

  let persistedUserMessage = persistedUserMessageByRawId

  if (persistedUserMessageByRawId?.id) {
    resolvedTurnKey = persistedUserMessageByRawId.id
  } else if (existingTurnPairByRawKey?.turn_key) {
    resolvedTurnKey = existingTurnPairByRawKey.turn_key
  } else if (isRegenerationRequest) {
    // Regeneration can arrive with synthetic IDs from the client. Only in that
    // case, use a content-based fallback to recover the best matching turn.
    const { data: persistedUserMessageByContent } = await supabase
      .from("messages")
      .select("id")
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .eq("role", "user")
      .eq("content", lastUserTurn.text)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (persistedUserMessageByContent?.id) {
      resolvedTurnKey = persistedUserMessageByContent.id
      persistedUserMessage = persistedUserMessageByContent
    } else {
      // The overwrite route updates message content via the service client.
      // The session client may miss the updated row due to RLS timing. Fall
      // back to the service client to find it.
      const { data: persistedUserMessageByContentService } =
        await bookkeepingSupabase
          .from("messages")
          .select("id")
          .eq("chat_id", chat.id)
          .eq("user_id", userId)
          .eq("role", "user")
          .eq("content", lastUserTurn.text)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

      if (persistedUserMessageByContentService?.id) {
        resolvedTurnKey = persistedUserMessageByContentService.id
        persistedUserMessage = persistedUserMessageByContentService
      }
    }
  }

  const effectiveLastUserText = lastUserTurn.text

  if (isRegenerationRequest) {
    const { data: pendingPairForContent } = await bookkeepingSupabase
      .from("chat_turn_pairs")
      .select("turn_key")
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .eq("user_content", effectiveLastUserText)
      .in("assistant_content", [
        PENDING_ASSISTANT_CONTENT,
        LEGACY_PENDING_ASSISTANT_CONTENT,
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pendingPairForContent?.turn_key) {
      resolvedTurnKey = pendingPairForContent.turn_key
      // The overwrite route already created/updated the message row for this
      // turn key. Mark it as found so the createMessage block below does not
      // insert a duplicate row and override resolvedTurnKey.
      if (!persistedUserMessage?.id) {
        persistedUserMessage = { id: pendingPairForContent.turn_key }
      }
    }
  }

  let transientUserMessageId: string | null = null

  if (!persistedUserMessage?.id) {
    const createdUserMessage = await createMessage(
      chat.id,
      userId,
      "user",
      lastUserTurn.text,
      { parts: lastUserPersistedParts ?? undefined }
    )

    if (createdUserMessage?.id) {
      resolvedTurnKey = createdUserMessage.id
      transientUserMessageId = createdUserMessage.id
    }
  }

  let pairPersistenceUnavailable = false

  const { data: existingPair, error: existingPairError } =
    await bookkeepingSupabase
      .from("chat_turn_pairs")
      .select("assistant_content")
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .eq("turn_key", resolvedTurnKey)
      .maybeSingle()

  if (existingPairError) {
    pairPersistenceUnavailable = true
  }

  if (
    !pairPersistenceUnavailable &&
    existingPair &&
    !isPendingAssistantContent(existingPair.assistant_content) &&
    !isRegenerationRequest
  ) {
    return createReplayTurnResponse(
      existingPair.assistant_content,
      generationMessages,
      "already-complete"
    )
  }

  if (!pairPersistenceUnavailable && !existingPair) {
    const { error: claimError } = await bookkeepingSupabase
      .from("chat_turn_pairs")
      .insert({
        chat_id: chat.id,
        user_id: userId,
        turn_key: resolvedTurnKey,
        user_content: effectiveLastUserText,
        assistant_content: PENDING_ASSISTANT_CONTENT,
      })

    if (claimError) {
      const isConflict =
        claimError.code === "23505" ||
        claimError.message.toLowerCase().includes("duplicate")

      if (!isConflict) {
        pairPersistenceUnavailable = true
      }

      const { data: latestPair } = await bookkeepingSupabase
        .from("chat_turn_pairs")
        .select("assistant_content")
        .eq("chat_id", chat.id)
        .eq("user_id", userId)
        .eq("turn_key", resolvedTurnKey)
        .maybeSingle()

      if (
        isConflict &&
        latestPair &&
        !isPendingAssistantContent(latestPair.assistant_content)
      ) {
        return createReplayTurnResponse(
          latestPair.assistant_content,
          generationMessages,
          "claim-missed-replayed"
        )
      }

      if (isConflict) {
        // Conflict means another request already claimed this turn. Return
        // already-pending (instead of claim-missed) so the client waits/retries
        // without surfacing a dead-state error.
        return createEmptyTurnResponse("already-pending")
      }
    }
  } else if (
    !pairPersistenceUnavailable &&
    isPendingAssistantContent(existingPair?.assistant_content) &&
    !isRegenerationRequest
  ) {
    return createEmptyTurnResponse("already-pending")
  }

  if (
    !isRegenerationRequest &&
    generationMessages[generationMessages.length - 1]?.role !== "user"
  ) {
    if (
      !pairPersistenceUnavailable &&
      existingPair?.assistant_content &&
      !isPendingAssistantContent(existingPair.assistant_content)
    ) {
      return createReplayTurnResponse(
        existingPair.assistant_content,
        generationMessages,
        "already-complete"
      )
    }

    return createEmptyTurnResponse("non-user-tail")
  }

  if (pairPersistenceUnavailable && !isRegenerationRequest) {
    const { data: latestPersistedRows } = await supabase
      .from("messages")
      .select("id, role, content")
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2)

    const latest = latestPersistedRows?.[0]
    const previous = latestPersistedRows?.[1]

    if (
      latest?.role === "assistant" &&
      typeof latest.content === "string" &&
      previous?.role === "user" &&
      previous.content === effectiveLastUserText
    ) {
      return createReplayTurnResponse(
        latest.content,
        generationMessages,
        "already-complete-legacy"
      )
    }

    if (
      latest?.role === "user" &&
      latest.content === effectiveLastUserText &&
      lastUserTurn.turnKey === latest.id
    ) {
      return createEmptyTurnResponse("already-pending-legacy")
    }
  }

  const selectedAgent = chat.agent_id
    ? isBypass
      ? await supabase
          .from("agents")
          .select("system_prompt")
          .eq("id", chat.agent_id)
          .maybeSingle()
          .then((r) => r.data)
      : await getAgent(chat.agent_id)
    : null
  const systemPrompt =
    (selectedAgent?.system_prompt ?? DEFAULT_SYSTEM_PROMPT) + NO_EMOJI_SUFFIX
  const resolvedModelId = resolveModelId(chat.model)
  const reasoningEnabledForModel = supportsReasoningForModel(resolvedModelId)
  const usageEventKey = crypto.randomUUID()

  const result = streamText({
    // Anthropic can return transient overload responses; retry to keep UX stable.
    maxRetries: 4,
    model: AI_DEVTOOLS_ENABLED
      ? wrapLanguageModel({
          model: anthropic(resolvedModelId),
          middleware: devToolsMiddleware(),
        })
      : anthropic(resolvedModelId),
    system: systemPrompt,
    messages: await convertToModelMessages(
      await prepareMessagesForModel(generationMessages, bookkeepingSupabase)
    ),
    providerOptions: reasoningEnabledForModel
      ? {
          anthropic: {
            thinking: { type: "adaptive" },
          },
        }
      : undefined,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: generationMessages,
    headers: STREAM_RESPONSE_HEADERS,
    onFinish: async ({ messages }) => {
      const lastUserText =
        effectiveLastUserText || getLastUserText(generationMessages)
      const assistantMessages = messages
        .filter((m) => isChatRole(m.role) && m.role === "assistant")
        .map((m) => getTextFromParts(m.parts).trim())
        .filter(Boolean)
      const lastAssistantText =
        assistantMessages[assistantMessages.length - 1] ?? ""
      let usageRecorded = false

      const recordUsageIfNeeded = async () => {
        if (usageRecorded || !lastAssistantText) return

        await recordUsageEvent({
          eventKey: usageEventKey,
          userId,
          chatId: chat.id,
          turnKey: resolvedTurnKey,
          source: "chat",
          model: resolvedModelId,
          requestTrigger,
          userMessageChars: lastUserText.length,
          assistantMessageChars: lastAssistantText.length,
        })

        usageRecorded = true
      }

      let pairPersisted = false

      if (lastAssistantText && !pairPersistenceUnavailable) {
        const persistedUserContent = lastUserTurn.text
        const pairPayload = {
          chat_id: chat.id,
          user_id: userId,
          turn_key: resolvedTurnKey,
          user_content: persistedUserContent,
          assistant_content: lastAssistantText,
          user_parts: (lastUserPersistedParts ?? null) as Json | null,
        }

        let { error: pairPersistError } = await bookkeepingSupabase
          .from("chat_turn_pairs")
          .upsert(pairPayload, {
            onConflict: "chat_id,user_id,turn_key",
          })

        if (pairPersistError && lastUserPersistedParts) {
          const fallbackResult = await bookkeepingSupabase
            .from("chat_turn_pairs")
            .upsert(
              {
                chat_id: chat.id,
                user_id: userId,
                turn_key: resolvedTurnKey,
                user_content: persistedUserContent,
                assistant_content: lastAssistantText,
              },
              {
                onConflict: "chat_id,user_id,turn_key",
              }
            )

          pairPersistError = fallbackResult.error
        }

        if (pairPersistError) {
          await bookkeepingSupabase.from("chat_trash_tokens").insert({
            chat_id: chat.id,
            user_id: userId,
            turn_key: resolvedTurnKey,
            user_content: persistedUserContent,
            assistant_content: lastAssistantText,
            reason: `pair_upsert_error:${pairPersistError.message}`,
          })
          pairPersistenceUnavailable = true
        } else {
          pairPersisted = true
        }

        if (pairPersisted) {
          await recordUsageIfNeeded()

          await bookkeepingSupabase
            .from("chat_turn_pairs")
            .delete()
            .eq("chat_id", chat.id)
            .eq("user_id", userId)
            .eq("user_content", persistedUserContent)
            .in("assistant_content", [
              PENDING_ASSISTANT_CONTENT,
              LEGACY_PENDING_ASSISTANT_CONTENT,
            ])
            .neq("turn_key", resolvedTurnKey)

          if (transientUserMessageId) {
            await supabase
              .from("messages")
              .delete()
              .eq("id", transientUserMessageId)
              .eq("chat_id", chat.id)
              .eq("user_id", userId)
          }

          revalidatePath("/dashboard", "layout")
          return
        }
      }

      if (!pairPersistenceUnavailable) {
        await bookkeepingSupabase
          .from("chat_turn_pairs")
          .delete()
          .eq("chat_id", chat.id)
          .eq("user_id", userId)
          .eq("turn_key", resolvedTurnKey)
          .in("assistant_content", [
            PENDING_ASSISTANT_CONTENT,
            LEGACY_PENDING_ASSISTANT_CONTENT,
          ])
      }

      const { data: recent } = await supabase
        .from("messages")
        .select("role, content")
        .eq("chat_id", chat.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(4)

      const recentMessages = recent ?? []
      const latestPersisted = recentMessages[0]
      const secondLatestPersisted = recentMessages[1]

      const hasTailUserDuplicate =
        latestPersisted?.role === "user" &&
        latestPersisted.content === lastUserText

      const hasAssistantForCurrentTurn =
        latestPersisted?.role === "assistant" &&
        secondLatestPersisted?.role === "user" &&
        secondLatestPersisted.content === lastUserText

      const hasCurrentTurnUserAlreadyPersisted =
        hasTailUserDuplicate ||
        hasAssistantForCurrentTurn ||
        Boolean(transientUserMessageId)

      if (lastUserText && !hasCurrentTurnUserAlreadyPersisted) {
        await createMessage(chat.id, userId, "user", lastUserText, {
          parts: lastUserPersistedParts ?? undefined,
        })
      }

      if (lastAssistantText && !hasAssistantForCurrentTurn) {
        await createMessage(chat.id, userId, "assistant", lastAssistantText)
      }

      if (lastAssistantText) {
        await recordUsageIfNeeded()
      }

      revalidatePath("/dashboard", "layout")
    },
  })
}
