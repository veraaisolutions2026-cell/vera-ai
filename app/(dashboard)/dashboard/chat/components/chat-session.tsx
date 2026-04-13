"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { AnimatePresence, motion } from "motion/react"
import { ShieldAlert, ScanSearch, FileText } from "lucide-react"
import { toast } from "sonner"
import { ChatComposer, type AttachedFile } from "./chat-composer"
import {
  ATTACHMENT_THINKING_PHRASES,
  AssistantFallback,
  ChatMessage,
  ThinkingIndicator,
} from "./chat-message"
import { ChatHeader } from "./chat-header"
import { supportsReasoningForModel } from "@/lib/models"
import type { Agent } from "@/types/database"
import {
  buildAttachmentFileParts,
  extractAttachmentsFromMessageParts,
} from "@/lib/chat-attachments"

type Props = {
  chatId: string
  initialTitle: string
  userName: string
  agents: Agent[]
  lockedModel: string
  initialMessages: UIMessage[]
  /** First message text for a brand-new chat (from the welcome screen). When
   *  set, initialMessages is empty and this text is sent via sendMessage({ text })
   *  so the AI SDK assigns a fresh ID and the welcome→chat transition plays. */
  pendingFirstMessage?: string
  selectedAgent: Agent | null
}

const PROMPT_CARDS = [
  {
    icon: ShieldAlert,
    title: "Analyse audit risk",
    description:
      "Surface key risks and material misstatements across an engagement",
    prompt:
      "Summarise the key audit risks and potential material misstatements I should address in this engagement. Include relevant assertions and suggested audit procedures.",
  },
  {
    icon: ScanSearch,
    title: "Review a workpaper",
    description: "Check completeness, accuracy, and sign-off readiness",
    prompt:
      "Review my workpaper for completeness, accuracy, and any gaps that could affect the audit conclusion. Flag missing cross-references, weak evidence, or unresolved exceptions.",
  },
  {
    icon: FileText,
    title: "Draft disclosure notes",
    description: "Generate IFRS-compliant financial statement language",
    prompt:
      "Draft IFRS-compliant disclosure notes for revenue recognition under IFRS 15. Include judgements made, performance obligations identified, and the basis of measurement.",
  },
]

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

const MAX_PERSISTED_SEEN_MESSAGE_IDS = 600

function getSeenMessagesStorageKey(chatId: string): string {
  return `vera-seen-chat-message-ids:${chatId}`
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

export function ChatSession({
  chatId,
  initialTitle,
  userName,
  agents,
  lockedModel,
  initialMessages,
  pendingFirstMessage,
  selectedAgent,
}: Props) {
  // [x] STABLE BASELINE (DO NOT CHANGE WITHOUT DOUBLE CONFIRMATION)
  // This component contains hardening for no-refresh reliability and race-safe
  // dead-state handling. Structural edits must be reviewed with the user first.

  const [input, setInput] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [showDeadStateFallback, setShowDeadStateFallback] = useState(false)
  const [deadStateFallbackText, setDeadStateFallbackText] = useState(
    "I couldn't generate a response this time. You can retry now."
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMessagesRef = useRef<UIMessage[]>([])
  const latestStatusRef = useRef<string>("ready")
  const previousStatusRef = useRef<string>("ready")
  const latestTurnStateRef = useRef<string | null>(null)
  const bootstrapAttemptRef = useRef<Record<string, number>>({})
  const bootstrapFallbackToastShownRef = useRef<Record<string, boolean>>({})
  const deadStateAutoRecoveryAttemptedRef = useRef<Record<string, boolean>>({})
  const bootstrapWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const seenMessageIdsRef = useRef<Set<string>>(new Set())
  const seenMessageIdsInitializedRef = useRef(false)

  if (!seenMessageIdsInitializedRef.current) {
    const seen = loadSeenMessageIds(chatId)
    for (const message of initialMessages) {
      seen.add(message.id)
    }
    seenMessageIdsRef.current = seen
    seenMessageIdsInitializedRef.current = true
  }

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${chatId}`,
        fetch: async (input, init) => {
          const response = await fetch(input, init)
          latestTurnStateRef.current = response.headers.get("x-vera-turn-state")
          return response
        },
      }),
    [chatId]
  )

  const { messages, sendMessage, status, stop, regenerate } = useChat({
    messages: initialMessages,
    transport,
  })

  const isStreaming = status === "submitted" || status === "streaming"

  useEffect(() => {
    latestMessagesRef.current = messages
  }, [messages])

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
        const latestUser = [...currentFlatMessages]
          .reverse()
          .find((message) => message.role === "user")
        const fallbackText = getDeadStateMessageFromTurnState(
          latestTurnStateRef.current
        )

        const turnState = latestTurnStateRef.current
        // Only auto-recover for states where the server sent NO content in the
        // response. "already-complete", "already-complete-legacy", and
        // "claim-missed-replayed" all return replay responses WITH content —
        // auto-recovering them sends the current messages (which now have an
        // assistant tail) back to the server, hitting non-user-tail and looping
        // into a permanent dead-state.
        const canAutoRecover =
          turnState === "already-pending" ||
          turnState === "already-pending-legacy" ||
          turnState === "claim-missed"

        if (latestUser && canAutoRecover) {
          const recoveryKey = `${chatId}:${latestUser.id}`
          if (!deadStateAutoRecoveryAttemptedRef.current[recoveryKey]) {
            deadStateAutoRecoveryAttemptedRef.current[recoveryKey] = true
            void sendMessage().catch(() => {
              // Let the normal fallback path handle final user messaging.
            })
            return
          }
        }

        showDeadState(fallbackText)
        toast.error(fallbackText)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [chatId, sendMessage, showDeadState, status])

  // Bootstrap: fire one generation automatically on mount.
  // reactStrictMode is false so this fires exactly once — no guards needed.
  useEffect(() => {
    // ── Case A: brand-new chat from the welcome screen ──────────────────────
    // pendingFirstMessage is set; initialMessages is empty. We use
    // sendMessage({ text }) so the AI SDK assigns a fresh random ID, pushes
    // the user message into state (triggering isWelcome → false and the
    // welcome→chat transition animation), and drives the full normal flow.
    // This avoids every timing issue that sendMessage(null) creates when the
    // messages array already contains a DB-persisted user message.
    if (pendingFirstMessage) {
      latestTurnStateRef.current = null

      void sendMessage({ text: pendingFirstMessage }).catch(() => {
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

    void sendMessage().catch(() => {
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
    if (isStreaming || hasAssistantAfterLatestUser(flatMessages)) {
      hideDeadState()
    }
  }, [flatMessages, hideDeadState, isStreaming])

  const isWelcome = flatMessages.length === 0
  const firstName = userName.split(" ")[0] || "User"
  const reasoningEnabled = useMemo(
    () => supportsReasoningForModel(lockedModel),
    [lockedModel]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [flatMessages, isStreaming])

  useEffect(() => {
    return () => {
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

  const send = useCallback(async () => {
    const text = input.trim()
    if ((text.length === 0 && attachedFiles.length === 0) || isStreaming) return

    latestTurnStateRef.current = null
    hideDeadState()
    setInput("")

    const files = attachedFiles
    setAttachedFiles([])

    try {
      await sendMessage({
        text,
        files: buildAttachmentFileParts(files),
      })
    } catch {
      showDeadState(
        "We could not complete this response. Please retry once your connection is stable."
      )
      toast.error(
        "Server is busy or your connection is unstable. Please retry."
      )
    }
  }, [
    input,
    isStreaming,
    attachedFiles,
    sendMessage,
    hideDeadState,
    showDeadState,
  ])

  const retryDeadState = useCallback(async () => {
    if (isStreaming) return
    latestTurnStateRef.current = null
    hideDeadState()

    try {
      await sendMessage()
    } catch {
      showDeadState(
        "Retry failed again. Please check network stability and try once more."
      )
      toast.error("Retry failed. Please check your network and try again.")
    }
  }, [isStreaming, sendMessage, hideDeadState, showDeadState])

  const handleRetry = useCallback(
    async (messageId: string) => {
      if (isStreaming) return
      latestTurnStateRef.current = null
      await regenerate({ messageId })
    },
    [isStreaming, regenerate]
  )

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
              isWelcome
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: -8, filter: "blur(4px)" }
            }
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ pointerEvents: isWelcome ? "auto" : "none" }}
          >
            <div className="flex w-full flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isWelcome ? 1 : 0, y: isWelcome ? 0 : -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="mb-1.5 px-4 text-center"
              >
                <h1 className="text-2xl font-semibold tracking-tight">
                  {getGreeting()}
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isWelcome ? 1 : 0, y: isWelcome ? 0 : -6 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.03 }}
                className="mb-16 px-4 text-sm text-muted-foreground sm:mb-28"
              >
                {getSubheading()}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isWelcome ? 1 : 0, y: isWelcome ? 0 : -8 }}
                transition={{ duration: 0.22, delay: 0.06 }}
                className="mt-6 w-full max-w-3xl px-4 sm:mt-10"
              >
                <p className="mb-2.5 text-[11px] font-medium tracking-wide text-muted-foreground/50 uppercase">
                  Get started with an example
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PROMPT_CARDS.map((card) => {
                    const Icon = card.icon
                    return (
                      <button
                        key={card.title}
                        onClick={() => typeIntoComposer(card.prompt)}
                        disabled={isStreaming}
                        className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/60 p-4 text-left transition-all hover:border-border/80 hover:bg-card disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute top-0 left-5 h-px w-[70%] -rotate-[0.8deg] bg-linear-to-r from-white/45 via-white/12 to-transparent"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/5 ring-inset"
                        />
                        <span className="relative z-10 flex flex-col gap-3">
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
                        </span>
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
              isWelcome
                ? { opacity: 0, y: 8, filter: "blur(4px)" }
                : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            transition={{ duration: 0.24, ease: "easeOut" }}
            style={{ pointerEvents: isWelcome ? "none" : "auto" }}
          >
            <div className="flex h-full flex-col">
              <ChatHeader
                chatId={chatId}
                initialTitle={initialTitle}
                messages={flatMessages}
              />

              <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl space-y-6 px-4 pt-8 pb-44">
                  {flatMessages.map((message, index) => {
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
            animate={isWelcome ? { bottom: "50%", y: 52 } : { bottom: 0, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-36"
              initial={false}
              animate={
                isWelcome
                  ? { opacity: 0 }
                  : {
                      opacity: 1,
                      background:
                        "linear-gradient(to top, var(--background) 0%, color-mix(in oklab, var(--background) 92%, transparent) 48%, transparent 100%)",
                    }
              }
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
            <div className="pointer-events-auto relative mx-auto w-full max-w-3xl px-4">
              <ChatComposer
                input={input}
                onInputChange={setInput}
                onSubmit={() => void send()}
                isLoading={isStreaming}
                onStop={() => void stop()}
                agents={agents}
                selectedAgent={selectedAgent}
                onAgentChange={() => {
                  toast.info("Agent is locked for this chat session")
                }}
                model={lockedModel}
                onModelChange={() => {
                  toast.info("Model is locked for this chat session")
                }}
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
