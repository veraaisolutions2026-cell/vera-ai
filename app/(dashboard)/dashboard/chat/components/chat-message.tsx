"use client"

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Check, Copy, Info, Loader2, Pencil, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { Button } from "@/components/ui/button"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@/components/ai/chain-of-thought"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/animate-ui/components/radix/tooltip"
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from "@/components/ai/attachments"
import type { ChatMessageAttachment } from "@/lib/chat-attachments"

/* ── Code block with copy button ─────────────────────────────── */

function CodeBlock({
  language,
  children,
}: {
  language?: string
  children: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div className="group/code relative mb-3 overflow-hidden rounded-lg border border-border/50 bg-muted/50 last:mb-0">
      <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-wide text-muted-foreground/70 uppercase">
          {language || "text"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3">
        <code className="font-mono text-xs leading-relaxed">{children}</code>
      </pre>
    </div>
  )
}

/* ── Static markdown components ──────────────────────────────── */

const mdComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-5 mb-2 text-base font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-5 mb-2 text-sm font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-4 mb-1.5 text-sm font-medium first:mt-0">{children}</h3>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string
    children?: ReactNode
  }) => {
    const match = /language-(\w+)/.exec(className || "")
    if (match) {
      return (
        <CodeBlock language={match[1]}>
          {String(children).replace(/\n$/, "")}
        </CodeBlock>
      )
    }
    return (
      <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px]">
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-foreground/20 pl-3 text-muted-foreground italic last:mb-0">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mb-3 overflow-x-auto rounded-lg border border-border/50 last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border-b border-border/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border-b border-border/30 px-3 py-2">{children}</td>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground/70"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-5 border-border/40" />,
}

/* ── Action buttons ───────────────────────────────────────────── */

function MessageActions({
  content,
  onRetry,
}: {
  content: string
  onRetry?: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-2 flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-foreground/6 hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      {onRetry && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRetry}
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Retry</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export function AssistantFallback({
  content,
  onRetry,
  isRetrying = false,
}: {
  content: string
  onRetry: () => void
  isRetrying?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Retry
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Main message component ───────────────────────────────────── */

type Props = {
  messageId?: string
  role: "user" | "assistant"
  content: string
  attachments?: ChatMessageAttachment[]
  reasoningContent?: string
  reasoningEnabled?: boolean
  isStreaming?: boolean
  revealOnMount?: boolean
  onRetry?: () => void
  onUserRetry?: () => void
  onUserEdit?: (messageId: string, content: string) => Promise<void> | void
}

const STREAM_REVEAL_INTERVAL_MS = 30
const STREAM_REVEAL_MIN_STEP = 1
const STREAM_REVEAL_MAX_STEP = 6

export function ChatMessage({
  messageId,
  role,
  content,
  attachments = [],
  reasoningContent,
  reasoningEnabled = false,
  isStreaming,
  revealOnMount = false,
  onRetry,
  onUserRetry,
  onUserEdit,
}: Props) {
  const reduceMotion = useReducedMotion()
  const [liveContent, setLiveContent] = useState("")
  const [isEditingUserMessage, setIsEditingUserMessage] = useState(false)
  const [userDraft, setUserDraft] = useState(content)
  const [isSavingUserEdit, setIsSavingUserEdit] = useState(false)
  // true while the reveal interval is actively draining the buffer, so the
  // non-streaming render keeps using liveContent instead of snapping to the
  // full content string.
  const [revealInProgress, setRevealInProgress] = useState(false)
  const streamBufferRef = useRef("")
  const prevRawContentRef = useRef("")
  const streamedOnceRef = useRef(false)

  useEffect(() => {
    streamBufferRef.current = ""
    prevRawContentRef.current = ""
    streamedOnceRef.current = false
    setLiveContent("")
    setRevealInProgress(false)
  }, [messageId])

  useEffect(() => {
    if (!isEditingUserMessage) {
      setUserDraft(content)
    }
  }, [content, isEditingUserMessage])

  useEffect(() => {
    if (role !== "assistant") return

    if (revealOnMount && !isStreaming && content) {
      // Message just finished streaming (or loaded from history). Queue the
      // full text into the reveal buffer so it drains progressively.
      streamedOnceRef.current = true
      streamBufferRef.current = content
      prevRawContentRef.current = content
      setLiveContent("")
      setRevealInProgress(true)
      return
    }

    if (!isStreaming) {
      // Streaming ended without revealOnMount (seen message or motion reduced).
      streamBufferRef.current = ""
      prevRawContentRef.current = content
      setRevealInProgress(false)
      setLiveContent(content)
      return
    }

    streamedOnceRef.current = true
    const prev = prevRawContentRef.current

    if (content.startsWith(prev)) {
      streamBufferRef.current += content.slice(prev.length)
    } else {
      // If stream diffing breaks (provider retry/chunk reset), recover gracefully.
      streamBufferRef.current = content
      setLiveContent("")
    }

    prevRawContentRef.current = content
  }, [content, isStreaming, revealOnMount, role])

  useEffect(() => {
    const shouldRevealProgressively = isStreaming || revealOnMount
    if (role !== "assistant" || !shouldRevealProgressively) return

    const id = setInterval(() => {
      const queued = streamBufferRef.current
      if (!queued) {
        // Buffer drained — reveal complete.
        setRevealInProgress(false)
        return
      }

      const step = Math.max(
        STREAM_REVEAL_MIN_STEP,
        Math.min(
          STREAM_REVEAL_MAX_STEP,
          Math.floor(Math.ceil(Math.sqrt(queued.length)) / 2)
        )
      )
      const take = queued.slice(0, step)
      streamBufferRef.current = queued.slice(step)
      setLiveContent((prev) => prev + take)
    }, STREAM_REVEAL_INTERVAL_MS)

    return () => clearInterval(id)
  }, [isStreaming, revealOnMount, role])

  if (role === "user") {
    const canEdit = Boolean(messageId && onUserEdit)

    async function handleSaveEdit() {
      if (!messageId || !onUserEdit) return

      const trimmed = userDraft.trim()
      if (!trimmed || trimmed === content.trim()) {
        setIsEditingUserMessage(false)
        return
      }

      setIsSavingUserEdit(true)
      try {
        await onUserEdit(messageId, trimmed)
        setIsEditingUserMessage(false)
      } finally {
        setIsSavingUserEdit(false)
      }
    }

    return (
      <div className="group/message flex justify-end">
        <div className="flex w-full max-w-[85%] flex-col items-end">
          {attachments.length > 0 && (
            <Attachments variant="inline" className="mb-2 justify-end">
              {attachments.map((attachment) => (
                <Attachment key={attachment.id} data={attachment}>
                  <AttachmentPreview />
                  <AttachmentInfo />
                </Attachment>
              ))}
            </Attachments>
          )}
          {isEditingUserMessage ? (
            <div className="w-full rounded-2xl rounded-br-sm border border-border/60 bg-card px-3 py-3">
              <textarea
                value={userDraft}
                onChange={(event) => setUserDraft(event.target.value)}
                rows={3}
                className="min-h-20 w-full resize-y rounded-xl border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/50"
              />
              <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/25 px-2.5 py-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your current prompt and assistant response will be
                  overwritten.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserDraft(content)
                    setIsEditingUserMessage(false)
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  disabled={isSavingUserEdit}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-85"
                  disabled={isSavingUserEdit}
                >
                  {isSavingUserEdit ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-br-sm bg-foreground/8 px-4 py-2.5 text-sm leading-relaxed">
              {content}
            </div>
          )}

          {!isEditingUserMessage && (
            <div className="mt-2 flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover/message:opacity-100 md:focus-within:opacity-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(content)
                      toast.success("Copied to clipboard")
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>

              {onUserRetry && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onUserRetry()}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Retry</TooltipContent>
                </Tooltip>
              )}

              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setIsEditingUserMessage(true)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-foreground/8 hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isStreaming) {
    const hasReasoning = Boolean(reasoningContent?.trim())
    // Only return null when there is truly nothing to show — no reasoning, no
    // live content, and no raw content either. Returning null when content has
    // arrived but the reveal interval hasn't fired yet (liveContent still empty)
    // creates a visible blank gap between the thinking indicator and the first
    // text appearing.
    if (!reasoningEnabled && !hasReasoning && !liveContent && !content)
      return null

    return (
      <div className="flex justify-start">
        <div className="max-w-[85%]">
          {(reasoningEnabled || hasReasoning) && (
            <ChainOfThought open className="mb-3 max-w-none">
              <ChainOfThoughtHeader className="text-xs">
                Vera is thinking
              </ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {hasReasoning ? (
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={mdComponents}
                    >
                      {reasoningContent!}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Gathering reasoning traces...
                  </p>
                )}
              </ChainOfThoughtContent>
            </ChainOfThought>
          )}

          {liveContent ? (
            <motion.div
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: 4, filter: "blur(4px)" }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, filter: "blur(0px)" }
              }
              transition={{
                duration: reduceMotion ? 0 : 0.28,
                ease: [0.25, 1, 0.5, 1],
              }}
            >
              <div className="prose-chat text-sm leading-[1.75]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents}
                >
                  {liveContent}
                </ReactMarkdown>
              </div>
              <motion.span
                aria-hidden
                className="mt-1 inline-block h-4 w-0.5 rounded-full bg-foreground/55 align-middle"
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{
                  duration: 1.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          ) : (
            // Content has arrived from the stream but the 30ms reveal interval
            // hasn't drained any characters into liveContent yet. Show just the
            // blinking cursor so there is no blank gap between the thinking
            // indicator disappearing and the progressive text reveal starting.
            <motion.span
              aria-hidden
              className="mt-1 inline-block h-4 w-0.5 rounded-full bg-foreground/55 align-middle"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="group/message flex justify-start"
      initial={
        reduceMotion || streamedOnceRef.current
          ? { opacity: 1 }
          : { opacity: 0, y: 10, filter: "blur(8px)", scale: 0.995 }
      }
      animate={
        reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }
      }
      transition={{
        duration: reduceMotion ? 0 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="max-w-[85%]">
        {/* Persistent CoT panel — shown collapsed after streaming ends.
            Matches v0-style: user can tap to expand and see the reasoning steps. */}
        {(reasoningEnabled || Boolean(reasoningContent?.trim())) && (
          <ChainOfThought className="mb-3 max-w-none">
            <ChainOfThoughtHeader className="text-xs">
              Thought for a moment
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              {reasoningContent?.trim() && (
                <div className="text-xs leading-relaxed text-muted-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={mdComponents}
                  >
                    {reasoningContent}
                  </ReactMarkdown>
                </div>
              )}
              {!reasoningContent?.trim() && reasoningEnabled && (
                <p className="text-xs text-muted-foreground">
                  This looked like a simple request, so no extra reasoning
                  details were returned.
                </p>
              )}
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}
        <div className="prose-chat text-sm leading-[1.75]">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
        </div>
        {content && <MessageActions content={content} onRetry={onRetry} />}
      </div>
    </motion.div>
  )
}

/* ── Shimmer thinking indicator ──────────────────────────────── */

const THINKING_PHRASES = [
  "Agent is thinking...",
  "Processing your request...",
  "Analyzing the data...",
  "Generating response...",
  "Almost there...",
]

const ATTACHMENT_THINKING_PHRASES = [
  "Parsing your document...",
  "Analyzing your document...",
  "Finding key findings...",
  "Mapping key sections and evidence...",
  "Preparing a focused review...",
]

export function ThinkingIndicator({
  phrases = THINKING_PHRASES,
}: {
  phrases?: string[]
}) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(0)
    const id = setInterval(() => setIdx((p) => (p + 1) % phrases.length), 3000)
    return () => clearInterval(id)
  }, [phrases])

  return (
    <div className="flex justify-start px-1 py-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          <ShimmeringText
            text={phrases[idx] ?? phrases[0] ?? "Thinking..."}
            className="text-sm"
            duration={2}
            spread={2.5}
            startOnView={false}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export { ATTACHMENT_THINKING_PHRASES }
