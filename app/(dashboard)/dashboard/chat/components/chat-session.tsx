"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { AnimatePresence, motion } from "motion/react"
import { ShieldAlert, ScanSearch, FileText } from "lucide-react"
import { toast } from "sonner"
import { updateAnswerPreference } from "@/actions/settings-actions"
import { AgentWelcomeHero } from "./agent-welcome-hero"
import { ChatAgentBar } from "./chat-agent-bar"
import { ChatComposer, type AttachedFile } from "./chat-composer"
import { DEFAULT_PROMPTS } from "./default-prompts"
import {
  ATTACHMENT_THINKING_PHRASES,
  AssistantFallback,
  ChatMessage,
  ThinkingIndicator,
} from "./chat-message"
import { ChatHeader } from "./chat-header"
import type { AnswerPreference } from "@/lib/answer-preference"
import type { PlanId } from "@/lib/billing-plans"
import { supportsReasoningForModel } from "@/lib/models"
import { showUsageUpsellToast } from "@/lib/usage-upsell-toast"
import type { Agent } from "@/types/database"
import {
  buildAttachmentFileParts,
  extractAttachmentsFromMessageParts,
  getVeraAttachmentMetadata,
  type PersistedFilePart,
} from "@/lib/chat-attachments"

type Props = {
  chatId: string
  initialTitle: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  agents: Agent[]
  lockedModel: string
  initialMessages: UIMessage[]
  /** First message text for a brand-new chat (from the welcome screen). When
   *  set, initialMessages is empty and this text is sent via sendMessage({ text })
   *  so the AI SDK assigns a fresh ID and the welcome→chat transition plays. */
  pendingFirstMessage?: string
  selectedAgent: Agent | null
  initialAnswerPreference?: AnswerPreference | null
}

const SUBHEADINGS = [
  "Working late? Let's keep it efficient.",
  "What needs your attention today?",
  "What would you like to work through?",
  "Ready to review, analyse, or draft.",
]

type FlatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  attachments: ReturnType<typeof extractAttachmentsFromMessageParts>
  reasoningContent?: string
}

type UserBranchState = {
  variants: string[]
  assistantVariants: Array<string | null>
  activeIndex: number
}

type LegacyBranchRow = {
  source_message_id: string
  branch_index: number
  content: string
  is_active: boolean
  source_content: string | null
  assistant_content: string | null
  source_assistant_content: string | null
}

const MAX_PERSISTED_SEEN_MESSAGE_IDS = 600

function getSeenMessagesStorageKey(chatId: string): string {
  return `vera-seen-chat-message-ids:${chatId}`
}

function stripMessageIdSuffix(id: string): string {
  return id.replace(/:(user|assistant)$/, "")
}

function getBranchStateStorageKey(chatId: string): string {
  return `vera-chat-branch-state:${chatId}`
}

function loadUserBranchMap(chatId: string): Record<string, UserBranchState> {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.sessionStorage.getItem(getBranchStateStorageKey(chatId))
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return {}

    const next: Record<string, UserBranchState> = {}

    for (const [messageId, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue

      const maybe = value as {
        variants?: unknown
        assistantVariants?: unknown
        activeIndex?: unknown
      }

      if (!Array.isArray(maybe.variants)) continue
      if (!Array.isArray(maybe.assistantVariants)) continue
      if (typeof maybe.activeIndex !== "number") continue

      const variants = maybe.variants.filter(
        (entry): entry is string => typeof entry === "string"
      )
      const assistantVariants = maybe.assistantVariants.map((entry) =>
        typeof entry === "string" ? entry : null
      )

      if (!variants.length) continue

      next[messageId] = {
        variants,
        assistantVariants:
          assistantVariants.length >= variants.length
            ? assistantVariants.slice(0, variants.length)
            : [
                ...assistantVariants,
                ...new Array(variants.length - assistantVariants.length).fill(
                  null
                ),
              ],
        activeIndex: Math.max(
          0,
          Math.min(variants.length - 1, maybe.activeIndex)
        ),
      }
    }

    return next
  } catch {
    return {}
  }
}

function persistUserBranchMap(
  chatId: string,
  map: Record<string, UserBranchState>
) {
  if (typeof window === "undefined") return

  try {
    window.sessionStorage.setItem(
      getBranchStateStorageKey(chatId),
      JSON.stringify(map)
    )
  } catch {
    // Best-effort only.
  }
}

function loadSeenMessageIds(chatId: string): Set<string> {
  if (typeof window === "undefined") return new Set<string>()

  try {
    const raw = window.sessionStorage.getItem(getSeenMessagesStorageKey(chatId))
    if (!raw) return new Set<string>()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    return new Set(
      parsed.filter((value): value is string => typeof value === "string")
    )
  } catch {
    return new Set<string>()
  }
}

function persistSeenMessageIds(chatId: string, ids: Set<string>) {
  if (typeof window === "undefined") return

  try {
    const asArray = Array.from(ids)
    const trimmed =
      asArray.length > MAX_PERSISTED_SEEN_MESSAGE_IDS
        ? asArray.slice(asArray.length - MAX_PERSISTED_SEEN_MESSAGE_IDS)
        : asArray
    window.sessionStorage.setItem(
      getSeenMessagesStorageKey(chatId),
      JSON.stringify(trimmed)
    )
  } catch {
    // Best-effort only. Animation suppression should not break chat flow.
  }
}

function getReasoningFromParts(parts: UIMessage["parts"]): string {
  let reasoning = ""

  for (const part of parts) {
    if (part.type !== "reasoning") continue
    const text = part.text.trim()
    if (!text) continue

    reasoning += reasoning ? `\n\n${text}` : text
  }

  return reasoning
}

function getDeadStateMessageFromTurnState(
  turnState: string | null | undefined
): string {
  switch (turnState) {
    case "invalid-payload":
    case "empty-messages":
      return "The previous request payload was incomplete. Please retry once to continue this turn."
    case "non-user-tail":
      return "This request ended on an assistant message, so no new generation was started. Retry once if output is missing."
    case "already-pending":
    case "already-pending-legacy":
      return "A request for this turn is already in progress. Please wait a moment, then retry if no response appears."
    case "claim-missed":
      return "This turn was claimed by another in-flight request. Retry once and the latest assistant output will be returned."
    case "already-complete":
    case "already-complete-legacy":
    case "claim-missed-replayed":
      return "This response was already generated on the server. If it did not render, retry once to replay it in the chat UI."
    default:
      return "I couldn't generate a response this time. You can retry now."
  }
}

function hasAssistantAfterLatestUser(messages: FlatMessage[]): boolean {
  let lastUserIndex = -1
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i
      break
    }
  }

  if (lastUserIndex === -1) return true

  for (let i = lastUserIndex + 1; i < messages.length; i += 1) {
    const message = messages[i]
    if (message?.role === "assistant" && message.content.trim().length > 0) {
      return true
    }
  }

  return false
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

/**
 * Build the initial branch state map synchronously from server-provided branch
 * rows and initialMessages. Runs as a useState lazy initializer so branches are
 * visible on the very first render with no client-side fetch needed.
 */
function buildInitialBranchMap(
  branches: LegacyBranchRow[],
  messages: UIMessage[]
): Record<string, UserBranchState> {
  if (!branches.length) return {}

  const userMessages = messages.filter((m) => m.role === "user")
  const userMessageById = new Map(userMessages.map((m) => [m.id, m]))
  const userMessageIds = new Set(userMessages.map((m) => m.id))
  const byContent = new Map<string, string[]>()
  for (const message of userMessages) {
    const text = getTextFromParts(message.parts).trim()
    if (!text) continue
    const existing = byContent.get(text) ?? []
    existing.push(message.id)
    byContent.set(text, existing)
  }
  const byStripped = new Map(
    userMessages.map((m) => [m.id.replace(/:(user|assistant)$/, ""), m.id])
  )

  // Build assistant content lookup
  const assistantByUser = new Map<string, string>()
  for (let i = 0; i < userMessages.length; i += 1) {
    const userMsg = userMessages[i]!
    const userIdx = messages.findIndex((m) => m.id === userMsg.id)
    const paired = messages
      .slice(userIdx + 1)
      .find((m) => m.role === "assistant")
    const text = paired ? getTextFromParts(paired.parts).trim() : ""
    if (text) assistantByUser.set(userMsg.id, text)
  }

  const grouped = new Map<string, LegacyBranchRow[]>()
  for (const row of branches) {
    if (!grouped.has(row.source_message_id))
      grouped.set(row.source_message_id, [])
    grouped.get(row.source_message_id)!.push(row)
  }

  const result: Record<string, UserBranchState> = {}

  for (const [sourceId, rows] of grouped.entries()) {
    let messageId = sourceId

    if (!userMessageIds.has(messageId)) {
      messageId = byStripped.get(messageId) ?? messageId
    }
    if (!userMessageIds.has(messageId)) {
      const sourceContent = rows
        .map((r) => r.source_content?.trim() ?? "")
        .find(Boolean)
      const sourceAssistantContent = rows
        .map((r) => r.source_assistant_content?.trim() ?? "")
        .find(Boolean)

      if (sourceContent) {
        const candidates = byContent.get(sourceContent) ?? []

        if (candidates.length === 1) {
          messageId = candidates[0]!
        } else if (candidates.length > 1) {
          if (sourceAssistantContent) {
            const matchedByPair = candidates.find(
              (candidateId) =>
                (assistantByUser.get(candidateId)?.trim() ?? "") ===
                sourceAssistantContent
            )
            if (matchedByPair) {
              messageId = matchedByPair
            }
          }

          if (!userMessageIds.has(messageId)) {
            // Deterministic fallback for duplicate user text: pick earliest turn.
            messageId = candidates[0]!
          }
        }
      }
    }
    if (!userMessageIds.has(messageId) && userMessages.length === 1) {
      messageId = userMessages[0]!.id
    }
    if (!userMessageIds.has(messageId)) continue

    const sorted = [...rows].sort((a, b) => a.branch_index - b.branch_index)

    const sourceAssistant = sorted
      .map((r) => r.source_assistant_content?.trim() ?? "")
      .find(Boolean)

    const sourceUserContent = userMessageById.get(messageId)
      ? getTextFromParts(userMessageById.get(messageId)!.parts).trim()
      : (sorted.map((r) => r.source_content?.trim() ?? "").find(Boolean) ?? "")

    if (!sourceUserContent) continue

    const variants: string[] = [sourceUserContent]
    const assistantVariants: Array<string | null> = [
      sourceAssistant || assistantByUser.get(messageId) || null,
    ]
    let activeIndex = 0

    for (const row of sorted) {
      const branchText = row.content?.trim()
      if (!branchText || variants.includes(branchText)) {
        if (row.is_active)
          activeIndex = Math.max(0, variants.indexOf(branchText))
        continue
      }
      variants.push(branchText)
      assistantVariants.push(row.assistant_content?.trim() || null)
      if (row.is_active) activeIndex = variants.length - 1
    }

    const canonicalKey = messageId.replace(/:(user|assistant)$/, "")
    result[canonicalKey] = { variants, assistantVariants, activeIndex }
  }

  return result
}

export function ChatSession({
  chatId,
  initialTitle,
  userId,
  userName,
  userAvatarUrl,
  agents,
  lockedModel,
  initialMessages,
  pendingFirstMessage,
  selectedAgent,
  initialAnswerPreference = null,
}: Props) {
  // [x] STABLE BASELINE (DO NOT CHANGE WITHOUT DOUBLE CONFIRMATION)
  // This component contains hardening for no-refresh reliability and race-safe
  // dead-state handling. Structural edits must be reviewed with the user first.

  const router = useRouter()
  const promptIcons = {
    "shield-alert": ShieldAlert,
    "scan-search": ScanSearch,
    "file-text": FileText,
  }
  const [input, setInput] = useState("")
  const [activeAgent, setActiveAgent] = useState<Agent | null>(selectedAgent)
  const [answerPreference, setAnswerPreference] =
    useState<AnswerPreference | null>(initialAnswerPreference)
  const [savedAnswerPreference, setSavedAnswerPreference] =
    useState<AnswerPreference | null>(initialAnswerPreference)
  const [isSubmitPending, setIsSubmitPending] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [pendingAnswerChoice, setPendingAnswerChoice] = useState<{
    text: string
    files: AttachedFile[]
    mode: "queued-message" | "resume-existing-turn"
  } | null>(() => {
    if (!pendingFirstMessage || initialAnswerPreference) {
      return null
    }

    return { text: pendingFirstMessage, files: [], mode: "queued-message" }
  })
  const [hasEnteredMainFlow, setHasEnteredMainFlow] = useState(() =>
    Boolean(pendingFirstMessage || initialMessages.length > 0)
  )
  const [showDeadStateFallback, setShowDeadStateFallback] = useState(false)
  const [userBranchMap, setUserBranchMap] = useState<
    Record<string, UserBranchState>
  >(() => buildInitialBranchMap([], initialMessages))
  const [deadStateFallbackText, setDeadStateFallbackText] = useState(
    "I couldn't generate a response this time. You can retry now."
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const streamScrollFrameRef = useRef<number | null>(null)
  const lastStreamAutoScrollAtRef = useRef(0)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMessagesRef = useRef<UIMessage[]>([])
  const latestStatusRef = useRef<string>("ready")
  const previousStatusRef = useRef<string>("ready")
  const latestTurnStateRef = useRef<string | null>(null)
  const bootstrapAttemptRef = useRef<Record<string, number>>({})
  const bootstrapFallbackToastShownRef = useRef<Record<string, boolean>>({})
  const bootstrapWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const answerChoiceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const seenMessageIdsInitializedRef = useRef(false)
  const branchStorageHydratedRef = useRef(false)
  const latestAnswerPreferenceRef = useRef<AnswerPreference | null>(
    initialAnswerPreference
  )

  if (!seenMessageIdsInitializedRef.current) {
    const seen = new Set<string>()
    for (const message of initialMessages) {
      seen.add(message.id)
    }
    seenMessageIdsRef.current = seen
    seenMessageIdsInitializedRef.current = true
  }

  useEffect(() => {
    latestAnswerPreferenceRef.current = answerPreference
  }, [answerPreference])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${chatId}`,
        fetch: async (input, init) => {
          let requestInit = init

          if (init?.body && typeof init.body === "string") {
            try {
              const parsed = JSON.parse(init.body) as {
                answerPreference?: unknown
                selectedAgentId?: unknown
              }

              const preference = latestAnswerPreferenceRef.current
              requestInit = {
                ...init,
                body: JSON.stringify({
                  ...parsed,
                  selectedAgentId: activeAgent?.id ?? null,
                  answerPreference:
                    preference === "short" || preference === "long"
                      ? preference
                      : undefined,
                }),
              }
            } catch {
              // Keep original body if parsing fails.
            }
          }

          const response = await fetch(input, requestInit)
          latestTurnStateRef.current = response.headers.get("x-vera-turn-state")

          if (response.status === 402) {
            latestTurnStateRef.current = "out-of-usage"
            throw new Error("out_of_usage")
          }

          return response
        },
      }),
    [activeAgent, chatId]
  )

  const { messages, sendMessage, status, stop, regenerate, setMessages } =
    useChat({
      id: chatId,
      messages: initialMessages,
      transport,
    })

  const isStreaming = status === "submitted" || status === "streaming"

  useEffect(() => {
    latestMessagesRef.current = messages
  }, [messages])

  useEffect(() => {
    if (!branchStorageHydratedRef.current) return
    persistUserBranchMap(chatId, userBranchMap)
  }, [chatId, userBranchMap])

  useEffect(() => {
    const persisted = loadSeenMessageIds(chatId)
    if (!persisted.size) return

    let changed = false
    for (const id of persisted) {
      if (seenMessageIdsRef.current.has(id)) continue
      seenMessageIdsRef.current.add(id)
      changed = true
    }

    if (changed) {
      persistSeenMessageIds(chatId, seenMessageIdsRef.current)
    }
  }, [chatId])

  useEffect(() => {
    const persisted = loadUserBranchMap(chatId)
    branchStorageHydratedRef.current = true
    if (!Object.keys(persisted).length) return

    setUserBranchMap((previous) => {
      const next = { ...previous }

      for (const [messageId, state] of Object.entries(persisted)) {
        // Always use canonical (stripped) key as single source of truth.
        const canonicalKey = stripMessageIdSuffix(messageId)
        const existing = next[canonicalKey]
        if (!existing || state.variants.length > existing.variants.length) {
          next[canonicalKey] = state
        }
      }

      return next
    })
  }, [chatId])

  useEffect(() => {
    latestStatusRef.current = status
  }, [status])

  const showDeadState = useCallback((message?: string) => {
    setDeadStateFallbackText(
      message ?? "I couldn't generate a response this time. You can retry now."
    )
    setShowDeadStateFallback(true)
  }, [])

  const hideDeadState = useCallback(() => {
    setShowDeadStateFallback(false)
  }, [])

  useEffect(() => {
    let didChange = false
    for (const message of messages) {
      if (seenMessageIdsRef.current.has(message.id)) continue
      seenMessageIdsRef.current.add(message.id)
      didChange = true
    }

    if (didChange) {
      persistSeenMessageIds(chatId, seenMessageIdsRef.current)
    }
  }, [chatId, messages])

  useEffect(() => {
    const wasSubmittingOrStreaming =
      previousStatusRef.current === "submitted" ||
      previousStatusRef.current === "streaming"

    // Always update synchronously so subsequent renders track the right prev state.
    previousStatusRef.current = status

    if (!wasSubmittingOrStreaming || status !== "ready") return

    // Grace window: the AI SDK can flush `status` and `messages` in separate React
    // renders. Checking immediately would see stale messages (no assistant yet) and
    // falsely trigger dead-state. Defer until all pending state updates settle.
    const timer = setTimeout(() => {
      const currentFlatMessages: FlatMessage[] = latestMessagesRef.current
        .filter((message) => isChatRole(message.role))
        .map((message) => ({
          id: message.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: getTextFromParts(message.parts),
          attachments: extractAttachmentsFromMessageParts(message.parts),
        }))

      if (!hasAssistantAfterLatestUser(currentFlatMessages)) {
        const turnState = latestTurnStateRef.current
        if (
          turnState === "already-pending" ||
          turnState === "already-pending-legacy"
        ) {
          // Another request already owns this turn. Avoid showing dead-state
          // fallback or auto-resubmitting, which can cause retry loops.
          return
        }

        const fallbackText = getDeadStateMessageFromTurnState(turnState)
        showDeadState(fallbackText)
        toast.error(fallbackText)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [showDeadState, status])

  // Bootstrap: fire one generation automatically on mount.
  // reactStrictMode is false so this fires exactly once - no guards needed.
  useEffect(() => {
    // ── Case A: brand-new chat from the welcome screen ──────────────────────
    // pendingFirstMessage is set; initialMessages is empty. For no-agent chats
    // without a chosen answer preference, hold the first request and ask for
    // the preference only after the routed chat session is on screen.
    if (pendingFirstMessage) {
      if (!initialAnswerPreference) {
        setPendingAnswerChoice({
          text: pendingFirstMessage,
          files: [],
          mode: "queued-message",
        })
        return
      }

      latestTurnStateRef.current = null

      void sendMessage({ text: pendingFirstMessage }).catch((error) => {
        if (isOutOfUsageError(error)) {
          showOutOfUsageToast()
          return
        }

        toast.error(
          "Response did not start. Server may be busy or your connection is unstable."
        )
        showDeadState(
          "The response did not start. Please retry and we will continue from your latest message."
        )
      })
      return
    }

    // ── Case B: page refreshed / reopened with an unanswered user message ───
    // initialMessages contains existing history. If the last message is a
    // user message with no assistant reply, fire a reconnect generation.
    const hasAssistant = initialMessages.some((m) => m.role === "assistant")
    if (hasAssistant) return
    const last = initialMessages[initialMessages.length - 1]
    if (!last || last.role !== "user") return

    // Preserve the same short/long preference gate even when the first
    // unresolved turn includes uploaded attachments.
    if (!initialAnswerPreference) {
      const pendingFiles: AttachedFile[] = last.parts.flatMap((part) => {
        if (part.type !== "file") return []

        const metadata = getVeraAttachmentMetadata(part as PersistedFilePart)
        if (!metadata) return []

        return [
          {
            type: metadata.attachmentType,
            name: part.filename ?? "attachment",
            mimeType: part.mediaType,
            size: metadata.size,
            storagePath: metadata.storagePath,
            signedUrl: part.url,
            text:
              metadata.attachmentType === "docx"
                ? (metadata.extractedText ?? undefined)
                : undefined,
          },
        ]
      })

      setPendingAnswerChoice({
        text: getTextFromParts(last.parts),
        files: pendingFiles,
        mode: "resume-existing-turn",
      })
      return
    }

    const attemptKey = `${chatId}:${last.id}`
    const attempts = bootstrapAttemptRef.current[attemptKey] ?? 0
    const showManualRetryToast = () => {
      if (bootstrapFallbackToastShownRef.current[attemptKey]) return
      bootstrapFallbackToastShownRef.current[attemptKey] = true

      toast.error(
        "We could not recover automatically. Server may be busy or your connection is unstable."
      )
      showDeadState(
        "Connection dropped before the assistant response was returned. Please retry this response."
      )
    }

    if (attempts >= 1) {
      showManualRetryToast()
      return
    }

    bootstrapAttemptRef.current[attemptKey] = attempts + 1

    if (bootstrapWatchdogRef.current) {
      clearTimeout(bootstrapWatchdogRef.current)
    }

    latestTurnStateRef.current = null

    void sendMessage().catch((error) => {
      if (isOutOfUsageError(error)) {
        showOutOfUsageToast()
        return
      }

      toast.error(
        "Response did not start. Server may be busy or your connection is unstable."
      )
      showDeadState(
        "The response did not start. Please retry and we will continue from your latest message."
      )
    })

    // Watchdog: if the response never arrives and status quietly goes back to
    // "ready" (e.g. network drop before TTFT), surface a manual retry prompt.
    bootstrapWatchdogRef.current = setTimeout(() => {
      const hasAssistantNow = latestMessagesRef.current.some(
        (m) => m.role === "assistant"
      )
      if (hasAssistantNow) return

      if (
        latestStatusRef.current === "submitted" ||
        latestStatusRef.current === "streaming"
      ) {
        return
      }

      showManualRetryToast()
    }, 6500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // empty deps intentional: mount bootstrap, runs once

  const flatMessages = useMemo<FlatMessage[]>(() => {
    return messages
      .filter((message) => isChatRole(message.role))
      .map((message) => ({
        id: message.id,
        role: message.role === "user" ? "user" : "assistant",
        content: getTextFromParts(message.parts),
        attachments: extractAttachmentsFromMessageParts(message.parts),
        reasoningContent: getReasoningFromParts(message.parts),
      }))
  }, [messages])

  useEffect(() => {
    if (
      pendingAnswerChoice ||
      isSubmitPending ||
      isStreaming ||
      flatMessages.length > 0
    ) {
      setHasEnteredMainFlow(true)
    }
  }, [flatMessages.length, isStreaming, isSubmitPending, pendingAnswerChoice])

  const assistantContentByUserMessageId = useMemo(() => {
    const map = new Map<string, string>()

    for (let index = 0; index < flatMessages.length; index += 1) {
      const message = flatMessages[index]
      if (message?.role !== "user") continue

      const pairedAssistant = flatMessages
        .slice(index + 1)
        .find((entry) => entry.role === "assistant")

      if (pairedAssistant?.content?.trim()) {
        map.set(message.id, pairedAssistant.content)
      }
    }

    return map
  }, [flatMessages])

  useEffect(() => {
    if (status !== "ready") return

    setUserBranchMap((previous) => {
      let changed = false
      const next = { ...previous }

      for (const message of flatMessages) {
        if (message.role !== "user") continue
        // Always key by canonical (stripped) ID.
        const canonicalKey = stripMessageIdSuffix(message.id)
        const existing = next[canonicalKey]
        const pairedAssistant =
          assistantContentByUserMessageId.get(message.id)?.trim() ?? null

        if (!existing) {
          next[canonicalKey] = {
            variants: [message.content],
            assistantVariants: [pairedAssistant],
            activeIndex: 0,
          }
          changed = true
          continue
        }

        // First assistant arrives after the user message was already seeded with
        // assistantVariants[0] = null. Fill it once to prevent selecting back to
        // original branch from triggering an unnecessary regenerate.
        const existingOriginalAssistant =
          existing.assistantVariants[0]?.trim() ?? ""

        if (
          pairedAssistant &&
          (existingOriginalAssistant.length === 0 ||
            pairedAssistant.length > existingOriginalAssistant.length)
        ) {
          const nextAssistantVariants = [...existing.assistantVariants]
          if (nextAssistantVariants.length === 0) {
            nextAssistantVariants.push(pairedAssistant)
          } else {
            nextAssistantVariants[0] = pairedAssistant
          }

          next[canonicalKey] = {
            ...existing,
            assistantVariants: nextAssistantVariants,
          }
          changed = true
        }
      }

      return changed ? next : previous
    })
  }, [assistantContentByUserMessageId, flatMessages, status])

  useEffect(() => {
    if (status !== "ready") return

    // When a branch is active, backfill or upgrade its assistant slot using the
    // settled assistant content from the paired turn.
    setUserBranchMap((previous) => {
      let changed = false
      const next = { ...previous }

      for (const message of flatMessages) {
        if (message.role !== "user") continue

        const canonicalKey = stripMessageIdSuffix(message.id)
        const state = next[canonicalKey]
        if (!state) continue

        const activeIndex = state.activeIndex
        if (activeIndex <= 0) continue

        const pairedAssistant =
          assistantContentByUserMessageId.get(message.id)?.trim() ?? ""
        if (!pairedAssistant) continue

        const existingAssistant =
          state.assistantVariants[activeIndex]?.trim() ?? ""
        if (
          existingAssistant.length > 0 &&
          pairedAssistant.length <= existingAssistant.length
        ) {
          continue
        }

        const nextAssistantVariants = [...state.assistantVariants]
        nextAssistantVariants[activeIndex] = pairedAssistant
        next[canonicalKey] = {
          ...state,
          assistantVariants: nextAssistantVariants,
        }
        changed = true
      }

      return changed ? next : previous
    })
  }, [assistantContentByUserMessageId, flatMessages, status])

  useEffect(() => {
    if (isStreaming || hasAssistantAfterLatestUser(flatMessages)) {
      hideDeadState()
    }
  }, [flatMessages, hideDeadState, isStreaming])

  const isWelcome = flatMessages.length === 0
  const showWelcomeLayout = isWelcome && !hasEnteredMainFlow
  const firstName = userName.split(" ")[0] || "User"
  const reasoningEnabled = useMemo(
    () => supportsReasoningForModel(lockedModel),
    [lockedModel]
  )

  const usagePlanRef = useRef<PlanId>("vera-coach")

  const showOutOfUsageToast = useCallback(() => {
    showUsageUpsellToast({
      reason: "usage-exhausted",
      plan: usagePlanRef.current,
      onUpgrade: () => router.push("/dashboard/billing"),
    })
  }, [router])

  const getUsageAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/usage/availability", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        return {
          isAvailable: true,
          plan: usagePlanRef.current,
        }
      }

      const payload = (await response.json()) as {
        isAvailable?: boolean
        plan?: PlanId
      }
      usagePlanRef.current = payload.plan ?? usagePlanRef.current

      return {
        isAvailable: payload.isAvailable !== false,
        plan: usagePlanRef.current,
      }
    } catch {
      // Do not block sending if the usage-check endpoint is temporarily unreachable.
      return {
        isAvailable: true,
        plan: usagePlanRef.current,
      }
    }
  }, [])

  const isOutOfUsageError = useCallback((error: unknown) => {
    if (error instanceof Error && error.message === "out_of_usage") {
      return true
    }

    return latestTurnStateRef.current === "out-of-usage"
  }, [])

  useEffect(() => {
    if (!isStreaming) return

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now()

    if (now - lastStreamAutoScrollAtRef.current < 96) {
      return
    }

    lastStreamAutoScrollAtRef.current = now
    streamScrollFrameRef.current = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
    })

    return () => {
      if (streamScrollFrameRef.current === null) return
      window.cancelAnimationFrame(streamScrollFrameRef.current)
      streamScrollFrameRef.current = null
    }
  }, [
    flatMessages[flatMessages.length - 1]?.content.length,
    flatMessages[flatMessages.length - 1]?.id,
    isStreaming,
  ])

  useEffect(() => {
    if (isStreaming) return

    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [flatMessages.length, isStreaming])

  useEffect(() => {
    return () => {
      if (streamScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(streamScrollFrameRef.current)
      }
      if (answerChoiceTimerRef.current) {
        clearTimeout(answerChoiceTimerRef.current)
      }
      if (bootstrapWatchdogRef.current) {
        clearTimeout(bootstrapWatchdogRef.current)
      }
      if (typingRef.current) {
        clearTimeout(typingRef.current)
      }
    }
  }, [])

  function typeIntoComposer(text: string) {
    if (typingRef.current) {
      clearTimeout(typingRef.current)
    }

    setInput("")
    let i = 0
    const speed = Math.max(12, Math.min(20, Math.round(6000 / text.length)))

    function tick() {
      i += 1
      setInput(text.slice(0, i))

      if (i < text.length) {
        typingRef.current = setTimeout(tick, speed)
      }
    }

    typingRef.current = setTimeout(tick, 60)
  }

  const send = useCallback(
    async (overrideText?: string, overridePreference?: AnswerPreference) => {
      const queuedRequest = pendingAnswerChoice
      const files = queuedRequest?.files ?? attachedFiles
      const text = (overrideText ?? queuedRequest?.text ?? input).trim()
      const shouldResumeExistingTurn =
        queuedRequest?.mode === "resume-existing-turn"
      const effectivePreference = overridePreference ?? answerPreference

      if (
        (text.length === 0 && files.length === 0) ||
        isStreaming ||
        isSubmitPending
      )
        return

      if (!effectivePreference) {
        setPendingAnswerChoice({ text, files, mode: "queued-message" })
        setIsSubmitPending(true)

        if (answerChoiceTimerRef.current) {
          clearTimeout(answerChoiceTimerRef.current)
        }

        answerChoiceTimerRef.current = setTimeout(() => {
          setIsSubmitPending(false)
        }, 240)
        return
      }

      if (effectivePreference) {
        setAnswerPreference(effectivePreference)

        if (
          overridePreference &&
          savedAnswerPreference !== effectivePreference
        ) {
          const result = await updateAnswerPreference(effectivePreference)
          if (result?.error) {
            toast.error(
              "Could not save your preference. We will use it for this chat only."
            )
          } else {
            setSavedAnswerPreference(result.answerPreference)
            toast.success(
              "Preference saved. You can change it in chat or Settings."
            )
          }
        }
      }

      setPendingAnswerChoice(null)

      // Show pending state immediately to avoid click-to-loader latency.
      setIsSubmitPending(true)

      const usage = await getUsageAvailability()
      if (!usage.isAvailable) {
        usagePlanRef.current = usage.plan
        showOutOfUsageToast()
        setIsSubmitPending(false)
        return
      }

      latestTurnStateRef.current = null
      hideDeadState()
      setInput("")

      setAttachedFiles([])

      try {
        if (shouldResumeExistingTurn) {
          await sendMessage()
        } else {
          await sendMessage({
            text,
            files: buildAttachmentFileParts(files),
          })
        }
      } catch (error) {
        if (isOutOfUsageError(error)) {
          showOutOfUsageToast()
          setIsSubmitPending(false)
          return
        }

        showDeadState(
          "We could not complete this response. Please retry once your connection is stable."
        )
        toast.error(
          "Server is busy or your connection is unstable. Please retry."
        )
        setIsSubmitPending(false)
      }
    },
    [
      input,
      answerPreference,
      isStreaming,
      isSubmitPending,
      attachedFiles,
      pendingAnswerChoice,
      getUsageAvailability,
      sendMessage,
      hideDeadState,
      isOutOfUsageError,
      savedAnswerPreference,
      showOutOfUsageToast,
      showDeadState,
    ]
  )

  useEffect(() => {
    if (
      status === "submitted" ||
      status === "streaming" ||
      status === "ready"
    ) {
      setIsSubmitPending(false)
    }
  }, [status])

  const triggerDefaultPrompt = useCallback(
    (prompt: (typeof DEFAULT_PROMPTS)[number]) => {
      if (prompt.behavior === "send-immediately") {
        const sendText = prompt.immediateText?.trim() || prompt.prefillText
        void send(sendText)
        return
      }

      typeIntoComposer(prompt.prefillText)
    },
    [send]
  )

  const retryDeadState = useCallback(async () => {
    if (isStreaming) return
    latestTurnStateRef.current = null
    hideDeadState()

    try {
      await sendMessage()
    } catch (error) {
      if (isOutOfUsageError(error)) {
        showOutOfUsageToast()
        return
      }

      showDeadState(
        "Retry failed again. Please check network stability and try once more."
      )
      toast.error("Retry failed. Please check your network and try again.")
    }
  }, [
    hideDeadState,
    isOutOfUsageError,
    isStreaming,
    sendMessage,
    showDeadState,
    showOutOfUsageToast,
  ])

  const handleRetry = useCallback(
    async (messageId: string) => {
      if (isStreaming) return
      latestTurnStateRef.current = null
      await regenerate({ messageId })
    },
    [isStreaming, regenerate]
  )

  const handleEditUser = useCallback(
    async (
      messageId: string,
      updatedContent: string,
      sourceContent: string,
      assistantMessageId: string
    ) => {
      if (isStreaming) return

      const trimmed = updatedContent.trim()
      if (!trimmed) return

      latestTurnStateRef.current = null
      hideDeadState()
      const previousMessages = messages
      const sourceAssistantMessage = previousMessages.find(
        (message) =>
          message.id === assistantMessageId && message.role === "assistant"
      )
      const sourceAssistantContent = sourceAssistantMessage
        ? getTextFromParts(sourceAssistantMessage.parts).trim()
        : undefined

      setMessages((currentMessages) => {
        // Truncate to discard everything after the assistant message being
        // regenerated. Without this, regenerate() sends all messages and
        // getLastUserTurn on the server picks up the wrong (later) user turn.
        const assistantIndex = currentMessages.findIndex(
          (m) => m.id === assistantMessageId && m.role === "assistant"
        )
        const truncated =
          assistantIndex >= 0
            ? currentMessages.slice(0, assistantIndex + 1)
            : currentMessages

        return truncated.map((message) => {
          if (message.id === messageId && message.role === "user") {
            return {
              ...message,
              parts: [{ type: "text", text: trimmed }],
            }
          }

          if (
            message.id === assistantMessageId &&
            message.role === "assistant"
          ) {
            return {
              ...message,
              parts: [{ type: "text", text: "" }],
            }
          }

          return message
        })
      })

      try {
        const response = await fetch(`/api/chat/${chatId}/overwrite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceMessageId: messageId,
            sourceContent,
            sourceAssistantContent,
            content: trimmed,
            assistantMessageId,
          }),
        })

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "(unreadable)")
          throw new Error(`Overwrite failed (${response.status}): ${errorBody}`)
        }

        await regenerate({ messageId: assistantMessageId })

        // The AI SDK's makeRequest catches errors internally (setting status
        // to "error") without re-throwing. Detect that case: after regenerate
        // resolves, if no assistant reply was produced, the regeneration failed
        // silently and messages are stuck in a truncated/blank state.
        let postRegenMessages: typeof previousMessages | undefined
        setMessages((current) => {
          postRegenMessages = current
          return current
        })

        if (postRegenMessages) {
          const chatRoles = postRegenMessages.filter((m) => isChatRole(m.role))
          const lastUserIdx = chatRoles.map((m) => m.role).lastIndexOf("user")
          const hasAssistantReply =
            lastUserIdx >= 0 &&
            chatRoles
              .slice(lastUserIdx + 1)
              .some(
                (m) =>
                  m.role === "assistant" &&
                  getTextFromParts(m.parts).trim().length > 0
              )

          if (!hasAssistantReply) {
            throw new Error(
              "Regeneration completed without producing an assistant response"
            )
          }
        }
      } catch {
        setMessages(previousMessages)
        showDeadState(
          "We could not complete this response. Please retry once your connection is stable."
        )
        toast.error(
          "Server is busy or your connection is unstable. Please retry."
        )
      }
    },
    [
      chatId,
      hideDeadState,
      isStreaming,
      messages,
      regenerate,
      setMessages,
      showDeadState,
    ]
  )

  const handleLockedModelChange = useCallback(
    (model: string) => {
      router.push(`/dashboard/chat?model=${encodeURIComponent(model)}`)
    },
    [router]
  )

  const handleAgentChange = useCallback((agent: Agent | null) => {
    setActiveAgent(agent)

    if (agent) {
      toast.success(`${agent.name} selected`)
      return
    }

    toast.info("No agent selected")
  }, [])

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 5) return `Still up, ${firstName}?`
    if (hour < 12) return `Good morning, ${firstName}.`
    if (hour < 17) return `Good afternoon, ${firstName}.`
    return `Good evening, ${firstName}.`
  }

  function getSubheading() {
    const hour = new Date().getHours()
    if (hour < 5) return SUBHEADINGS[0]
    if (hour < 12) return SUBHEADINGS[1]
    if (hour < 17) return SUBHEADINGS[2]
    return SUBHEADINGS[3]
  }

  const lastMessage = flatMessages[flatMessages.length - 1]
  // Show the generic thinking phrase only when there is no assistant message
  // yet (status = "submitted" or before the first chunk arrives), or when the
  // last message is an assistant without text AND it's a non-reasoning model.
  // For reasoning models the ChainOfThought panel inside ChatMessage acts as
  // the thinking indicator once the assistant message exists, so we suppress
  // the ThinkingIndicator to avoid a visual duplicate.
  const showThinkingIndicator =
    isStreaming &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (!reasoningEnabled &&
        lastMessage.role === "assistant" &&
        !lastMessage.content.trim()))
  const thinkingPhrases =
    lastMessage?.role === "user" && lastMessage.attachments.length > 0
      ? ATTACHMENT_THINKING_PHRASES
      : undefined

  return (
    <motion.div
      className="flex h-full flex-col"
      initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
    >
      <div className="relative h-full">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key="welcome-layer"
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center pb-8"
            initial={false}
            animate={
              showWelcomeLayout
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: -8, filter: "blur(4px)" }
            }
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ pointerEvents: showWelcomeLayout ? "auto" : "none" }}
          >
            <div className="pointer-events-auto absolute inset-x-0 top-0 z-10">
              <div className="flex w-full px-4 pt-4 sm:px-6 lg:px-8">
                <ChatAgentBar
                  agents={agents}
                  selectedAgent={activeAgent}
                  onAgentChange={handleAgentChange}
                />
              </div>
            </div>

            <div className="flex w-full flex-col items-center">
              {activeAgent ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: showWelcomeLayout ? 1 : 0,
                    y: showWelcomeLayout ? 0 : -6,
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full"
                >
                  <AgentWelcomeHero
                    agent={activeAgent}
                    userId={userId}
                    userName={userName}
                    userAvatarUrl={userAvatarUrl}
                  />
                </motion.div>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: showWelcomeLayout ? 1 : 0,
                      y: showWelcomeLayout ? 0 : -6,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mb-1.5 px-4 text-center"
                  >
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {getGreeting()}
                    </h1>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: showWelcomeLayout ? 1 : 0,
                      y: showWelcomeLayout ? 0 : -6,
                    }}
                    transition={{
                      duration: 0.2,
                      ease: "easeOut",
                      delay: 0.03,
                    }}
                    className="mb-16 px-4 text-sm text-muted-foreground sm:mb-28"
                  >
                    {getSubheading()}
                  </motion.p>
                </>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: showWelcomeLayout ? 1 : 0,
                  y: showWelcomeLayout ? 0 : -8,
                }}
                transition={{ duration: 0.22, delay: 0.06 }}
                className="mt-6 w-full max-w-4xl px-4 sm:mt-10"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {DEFAULT_PROMPTS.map((card) => {
                    const Icon = promptIcons[card.icon]
                    return (
                      <button
                        key={card.id}
                        onClick={() => triggerDefaultPrompt(card)}
                        disabled={isStreaming}
                        className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left transition-all hover:border-border/80 hover:bg-card disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/6 text-muted-foreground/70 transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-sm leading-snug font-medium">
                            {card.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {card.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            key="chat-layer"
            className="absolute inset-0 flex h-full flex-col"
            initial={false}
            animate={
              showWelcomeLayout
                ? { opacity: 0, y: 8, filter: "blur(4px)" }
                : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            transition={{ duration: 0.24, ease: "easeOut" }}
            style={{ pointerEvents: showWelcomeLayout ? "none" : "auto" }}
          >
            <div className="flex h-full flex-col">
              <ChatHeader
                chatId={chatId}
                initialTitle={initialTitle}
                messages={flatMessages}
                agentBar={
                  <ChatAgentBar
                    agents={agents}
                    selectedAgent={activeAgent}
                    onAgentChange={handleAgentChange}
                  />
                }
              />

              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl space-y-6 px-4 pt-6 pb-44">
                  {flatMessages.map((message, index) => {
                    const pairedAssistantMessageId =
                      message.role === "user"
                        ? (flatMessages
                            .slice(index + 1)
                            .find((entry) => entry.role === "assistant")?.id ??
                          null)
                        : null
                    const isStreamingThis =
                      isStreaming &&
                      index === flatMessages.length - 1 &&
                      message.role === "assistant"
                    const shouldAnimateMessage = !seenMessageIdsRef.current.has(
                      message.id
                    )
                    const shouldRevealOnMount =
                      !isStreamingThis &&
                      message.role === "assistant" &&
                      shouldAnimateMessage &&
                      index === flatMessages.length - 1

                    return (
                      <div
                        key={message.id}
                        className={
                          shouldAnimateMessage ? "animate-message-in" : ""
                        }
                      >
                        <ChatMessage
                          messageId={message.id}
                          role={message.role}
                          content={message.content}
                          attachments={message.attachments}
                          reasoningContent={message.reasoningContent}
                          reasoningEnabled={reasoningEnabled}
                          isStreaming={isStreamingThis}
                          revealOnMount={shouldRevealOnMount}
                          onUserEdit={
                            !isStreaming &&
                            message.role === "user" &&
                            pairedAssistantMessageId
                              ? (messageId, content) =>
                                  handleEditUser(
                                    messageId,
                                    content,
                                    message.content,
                                    pairedAssistantMessageId
                                  )
                              : undefined
                          }
                          onRetry={
                            !isStreaming && message.role === "assistant"
                              ? () => void handleRetry(message.id)
                              : undefined
                          }
                        />
                      </div>
                    )
                  })}

                  {showThinkingIndicator && (
                    <div className="animate-message-in">
                      <ThinkingIndicator phrases={thinkingPhrases} />
                    </div>
                  )}

                  {!isStreaming && showDeadStateFallback && (
                    <div className="animate-message-in">
                      <AssistantFallback
                        content={deadStateFallbackText}
                        onRetry={() => void retryDeadState()}
                        isRetrying={isStreaming}
                      />
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            key="composer-layer"
            className="pointer-events-none absolute inset-x-0 z-20"
            initial={false}
            animate={
              showWelcomeLayout ? { bottom: "50%", y: 52 } : { bottom: 0, y: 0 }
            }
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-36"
              initial={false}
              animate={
                showWelcomeLayout
                  ? { opacity: 0 }
                  : {
                      opacity: 1,
                      background:
                        "linear-gradient(to top, var(--background) 0%, color-mix(in oklab, var(--background) 92%, transparent) 48%, transparent 100%)",
                    }
              }
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
            <div className="pointer-events-auto relative mx-auto w-full max-w-4xl px-4">
              <ChatComposer
                input={input}
                onInputChange={setInput}
                onSubmit={() => void send()}
                isLoading={isStreaming || isSubmitPending}
                onStop={isStreaming ? () => void stop() : undefined}
                showAnswerPreferencePrompt={Boolean(
                  pendingAnswerChoice && !isStreaming && !isSubmitPending
                )}
                onAnswerPreferenceSelect={(preference) =>
                  void send(undefined, preference)
                }
                model={lockedModel}
                onModelChange={handleLockedModelChange}
                attachedFiles={attachedFiles}
                onFileAttach={(file) =>
                  setAttachedFiles((prev) => [...prev, file])
                }
                onFileClear={(index) =>
                  setAttachedFiles((prev) =>
                    prev.filter((_, currentIndex) => currentIndex !== index)
                  )
                }
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
