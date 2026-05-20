"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  ChevronRight,
  Loader2,
  PenLine,
  Send,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createUserAgent } from "@/actions/agent-actions"
import { AgentIconPicker } from "@/components/agent-icon-picker"
import { Loader } from "@/components/ai/loader"
import { AgentKnowledgeBaseManager } from "@/components/agent-knowledge-base-manager"
import { AGENT_ICONS } from "@/lib/agent-icons"
import { TextEffect } from "@/components/ui/text-effect"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai/chain-of-thought"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
  type TaskStatus,
} from "@/components/animate-ui/components/task"
import { cn } from "@/lib/utils"

/* ── Animation helpers (mirrors chat-message.tsx) ─────────────── */
import { ModelPicker } from "@/components/model-picker"
import { DEFAULT_CHAT_MODEL_ID, getModelLabel } from "@/lib/models"

const CHAR_STAGGER = 0.008
const BLOCK_DUR = 0.32

type Segment = { type: "text" | "block"; content: string }

function splitIntoSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const lines = content.split("\n")
  let index = 0
  let textLines: string[] = []

  function flushText() {
    const text = textLines.join("\n").trim()
    if (text) {
      segments.push({ type: "text", content: text })
    }
    textLines = []
  }

  while (index < lines.length) {
    const line = lines[index]

    if (/^\s*(```|~~~)/.test(line)) {
      flushText()
      const fence = line.trimStart().match(/^(```|~~~)/)?.[0] ?? "```"
      const codeLines = [line]
      index += 1

      while (
        index < lines.length &&
        !lines[index].trimStart().startsWith(fence)
      ) {
        codeLines.push(lines[index])
        index += 1
      }

      if (index < lines.length) {
        codeLines.push(lines[index])
        index += 1
      }

      segments.push({ type: "block", content: codeLines.join("\n") })
      continue
    }

    if (line.trimStart().startsWith("|")) {
      flushText()
      const tableLines = [line]
      index += 1

      while (index < lines.length && lines[index].trimStart().startsWith("|")) {
        tableLines.push(lines[index])
        index += 1
      }

      segments.push({ type: "block", content: tableLines.join("\n") })
      continue
    }

    textLines.push(line)
    index += 1
  }

  flushText()
  return segments.filter((segment) => segment.content.trim())
}

function isPlainText(text: string) {
  return !/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|\*\*|\*[^*\s]|__|`|\[.+\]\(|^>/m.test(
    text
  )
}

function buildAnimSegments(content: string) {
  let delay = 0.02

  return splitIntoSegments(content).map((segment) => {
    const segmentDelay = delay
    const plain = segment.type === "text" && isPlainText(segment.content)

    delay += plain
      ? segment.content.length * CHAR_STAGGER + 0.18
      : BLOCK_DUR + 0.1

    return { ...segment, delay: segmentDelay, plain }
  })
}

/* ── Markdown components ────────────────────────────────────────── */

const mdComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-3 mb-1 text-sm font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-3 mb-1 text-[13px] font-medium first:mt-0">{children}</h3>
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
        <div className="mb-2 overflow-hidden rounded-lg border border-border/50 bg-muted/50">
          <div className="border-b border-border/40 px-3 py-1.5">
            <span className="font-mono text-xs tracking-wide text-muted-foreground/70 uppercase">
              {match[1]}
            </span>
          </div>
          <pre className="overflow-x-auto px-4 py-3">
            <code className="font-mono text-xs leading-relaxed">
              {String(children).replace(/\n$/, "")}
            </code>
          </pre>
        </div>
      )
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">
        {children}
      </code>
    )
  },
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mb-2 border-l-2 border-foreground/20 pl-3 text-muted-foreground italic last:mb-0">
      {children}
    </blockquote>
  ),
}

/* ── Tool types ─────────────────────────────────────────────────── */

type CreateAgentResult = {
  success: boolean
  agent_id?: string
  name?: string
  icon?: string
  description?: string
  category?: string
  system_prompt?: string
  base_model?: string
  error?: string
}

type NormalizedCreatePart = {
  id: string
  state: "call" | "partial-call" | "result"
  args: Record<string, unknown>
  result?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeCreateAgentPart(part: unknown): NormalizedCreatePart | null {
  if (!isRecord(part)) return null

  // Legacy tool part shape.
  if (part.type === "tool-invocation" && part.toolName === "create_agent") {
    const id =
      typeof part.toolInvocationId === "string"
        ? part.toolInvocationId
        : "create_agent"
    const state =
      part.state === "call" ||
      part.state === "partial-call" ||
      part.state === "result"
        ? part.state
        : "call"
    return {
      id,
      state,
      args: isRecord(part.args) ? part.args : {},
      result: part.result,
    }
  }

  // AI SDK v5 tool part shape.
  if (part.type !== "tool-create_agent") return null

  const id =
    typeof part.toolCallId === "string"
      ? part.toolCallId
      : typeof part.id === "string"
        ? part.id
        : "create_agent"
  const stateRaw = typeof part.state === "string" ? part.state : ""
  const args = isRecord(part.input) ? part.input : {}

  if (stateRaw === "output-available") {
    return { id, state: "result", args, result: part.output }
  }

  if (stateRaw === "output-error") {
    const errorMessage =
      typeof part.errorText === "string"
        ? part.errorText
        : typeof part.error === "string"
          ? part.error
          : "unknown error"

    return {
      id,
      state: "result",
      args,
      result: { success: false, error: errorMessage },
    }
  }

  if (stateRaw === "input-streaming") {
    return { id, state: "partial-call", args }
  }

  return { id, state: "call", args }
}

/* ── Animated text (hybrid: plain = char-by-char, formatted = blur-fade) ── */

function AnimatedText({
  text,
  animate,
  stream,
}: {
  text: string
  animate: boolean
  stream: boolean
}) {
  if (!text) return null

  if (stream) {
    return (
      <div className="text-sm leading-[1.7] whitespace-pre-wrap text-foreground/90">
        {text}
      </div>
    )
  }

  if (!animate) {
    return (
      <div className="text-sm leading-[1.7]">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {text}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div className="text-sm leading-[1.7]">
      {buildAnimSegments(text).map((seg, i) => {
        if (!seg.plain) {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: BLOCK_DUR,
                delay: seg.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={mdComponents}
              >
                {seg.content}
              </ReactMarkdown>
            </motion.div>
          )
        }
        return (
          <TextEffect
            key={i}
            per="char"
            as="p"
            delay={seg.delay}
            variants={{
              container: {
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: CHAR_STAGGER },
                },
              },
              item: {
                hidden: { opacity: 0, filter: "blur(8px)" },
                visible: {
                  opacity: 1,
                  filter: "blur(0px)",
                  transition: { duration: 0.16 },
                },
              },
            }}
            className="mb-2 whitespace-pre-wrap last:mb-0"
          >
            {seg.content}
          </TextEffect>
        )
      })}
    </div>
  )
}

/* ── Single Travers message ─────────────────────────────────────── */

function AcaMessage({
  message,
  animate,
  streaming,
  onView,
}: {
  message: UIMessage
  animate: boolean
  streaming: boolean
  onView: (id: string) => void
}) {
  // Track whether this message has been animated so we can show
  // a persistent collapsed CoT panel after animation ends.
  const [wasAnimated, setWasAnimated] = useState(false)
  const [isCoTOpen, setIsCoTOpen] = useState(false)

  useEffect(() => {
    if (animate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasAnimated(true)
      setIsCoTOpen(true) // open while animating
    } else if (wasAnimated) {
      setIsCoTOpen(false) // collapse after animation ends
    }
  }, [animate]) // eslint-disable-line react-hooks/exhaustive-deps
  // User bubble
  if (message.role === "user") {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("")
    return (
      <div
        data-testid="agent-builder-user-message"
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-foreground/12 px-3.5 py-2.5 text-sm">
          {text}
        </div>
      </div>
    )
  }

  // Collect text and tool parts
  const textContent = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("")

  const createPart =
    message.parts
      .map((part) => normalizeCreateAgentPart(part))
      .find((part): part is NormalizedCreatePart => part !== null) ?? null
  const isPending = Boolean(
    createPart &&
    (createPart.state === "call" || createPart.state === "partial-call")
  )
  const isDone = Boolean(createPart && createPart.state === "result")
  const result =
    createPart?.state === "result"
      ? (createPart.result as CreateAgentResult)
      : null
  const args = createPart
    ? (createPart.args as {
        name?: string
        icon?: string
        description?: string
        category?: string
        base_model?: string
        system_prompt?: string
      })
    : null

  const IconComponent = args?.icon ? (AGENT_ICONS[args.icon] ?? Bot) : Bot

  return (
    <div
      data-testid="agent-builder-assistant-message"
      className="flex items-start gap-2.5"
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/8">
        <Bot className="h-3 w-3 text-foreground/50" />
      </div>
      <div className="min-w-0 flex-1">
        {/* Persistent CoT panel for text-only responses (no tool invocation).
            Open while animating, collapses after — user can tap to expand. */}
        {wasAnimated && !createPart && textContent && (
          <ChainOfThought
            open={isCoTOpen}
            onOpenChange={setIsCoTOpen}
            className="mb-2 max-w-none"
          >
            <ChainOfThoughtHeader className="text-xs">
              Thought for a moment
            </ChainOfThoughtHeader>
            <ChainOfThoughtContent>
              <ChainOfThoughtStep
                icon={Brain}
                label="Processed your message"
                status="complete"
              />
              <ChainOfThoughtStep
                icon={PenLine}
                label="Crafted response"
                status="complete"
              />
            </ChainOfThoughtContent>
          </ChainOfThought>
        )}

        {/* Text response */}
        {textContent && (
          <AnimatedText
            text={textContent}
            animate={animate && !createPart}
            stream={streaming && !createPart}
          />
        )}

        {/* Show immediate progress while the model prepares a tool call. */}
        {streaming && !createPart && (
          <Task defaultOpen className="mt-2">
            <TaskTrigger title="Travers is preparing your agent" />
            <TaskContent>
              <TaskItem
                label="Synthesizing your intent and audit context…"
                description="Extracting purpose, domain constraints, and operating style"
                status="in_progress"
              />
            </TaskContent>
          </Task>
        )}

        {/* Chain of thought for create_agent tool */}
        {/* Task UI for create_agent tool */}
        {createPart &&
          (() => {
            const isPartialCall = createPart.state === "partial-call"
            const isCall = createPart.state === "call"

            const step2Status: TaskStatus =
              isPartialCall || isCall ? "in_progress" : "completed"

            const step3Status: TaskStatus = isPartialCall
              ? "in_progress"
              : isDone
                ? "completed"
                : "pending"

            const step4Status: TaskStatus = isPartialCall
              ? "pending"
              : isCall
                ? "in_progress"
                : isDone && result?.success
                  ? "completed"
                  : isDone && !result?.success
                    ? "error"
                    : "in_progress"

            const summaryMd =
              isDone && result?.success
                ? [
                    `**${result.name}**`,
                    result.description ? `\n${result.description}` : null,
                    `\n\n**Category:** ${result.category || "General"} · **Model:** ${getModelLabel(result.base_model)}`,
                  ]
                    .filter(Boolean)
                    .join("")
                : null

            return (
              <>
                <Task defaultOpen={isPending} className="mt-2">
                  <TaskTrigger
                    title="Travers built this agent"
                    badge={
                      isDone && result?.success ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 dark:text-emerald-400">
                          Done
                        </span>
                      ) : isPending ? (
                        <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-xs text-muted-foreground">
                          Building…
                        </span>
                      ) : null
                    }
                  />
                  <TaskContent>
                    <TaskItem
                      label="Requirement synthesis complete"
                      description="Mapped your goals to an implementation-ready brief"
                      status="completed"
                    />

                    <TaskItem
                      label={
                        args?.name ? (
                          <span>
                            Designing capability architecture for{" "}
                            <span className="font-medium text-foreground">
                              {args.name}
                            </span>
                          </span>
                        ) : (
                          "Designing capability architecture"
                        )
                      }
                      description={
                        [
                          args?.category,
                          args?.icon && `${args.icon} icon`,
                          args?.base_model && getModelLabel(args.base_model),
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                        "Selecting role, category, and operating persona"
                      }
                      status={step2Status}
                    />

                    <TaskItem
                      label="Composing prompt layers and guardrails"
                      description="Building structured instructions, failure handling, and policy boundaries"
                      status={step3Status}
                    />

                    <TaskItem
                      label={
                        isDone && result?.success
                          ? "Persistence and registry update complete"
                          : isDone && !result?.success
                            ? `Persistence failed: ${result?.error ?? "unknown error"}`
                            : "Creating and saving agent…"
                      }
                      description="Writing the final agent configuration to your workspace"
                      status={step4Status}
                    />
                  </TaskContent>
                </Task>

                {/* Markdown summary after completion */}
                {summaryMd && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="mt-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-sm"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={mdComponents}
                    >
                      {summaryMd}
                    </ReactMarkdown>
                  </motion.div>
                )}

                {/* View agent button */}
                {isDone && result?.success && result.agent_id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="mt-2 flex items-center gap-2"
                  >
                    <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <button
                      onClick={() => onView(result.agent_id!)}
                      className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/8"
                    >
                      View agent
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </motion.div>
                )}
              </>
            )
          })()}
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────── */

export function AgentBuilder({
  afterSavePath = "/dashboard/agents",
}: {
  afterSavePath?: string
}) {
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const processedToolIds = useRef(new Set<string>())

  // Form state
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("Bot")
  const [description, setDescription] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [baseModel, setBaseModel] = useState(DEFAULT_CHAT_MODEL_ID)
  const [category, setCategory] = useState("")
  const [saving, setSaving] = useState(false)
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null)
  const [isRouteLoading, setIsRouteLoading] = useState(false)

  // Chat state
  const [acaInput, setAcaInput] = useState("")
  const acaInputRef = useRef<HTMLTextAreaElement>(null)
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const lastAnimatedIdRef = useRef<string | null>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent-builder/chat" }),
  })

  const acaIsLoading = status === "submitted" || status === "streaming"

  const assistantMessages = messages.filter((m) => m.role === "assistant")
  const latestAssistantId =
    assistantMessages[assistantMessages.length - 1]?.id ?? null

  // Trigger animation when a new assistant message finishes streaming
  useEffect(() => {
    if (
      status === "ready" &&
      latestAssistantId &&
      latestAssistantId !== lastAnimatedIdRef.current
    ) {
      lastAnimatedIdRef.current = latestAssistantId
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimatingId(latestAssistantId)
    }
  }, [status, latestAssistantId])

  // Watch for create_agent tool results — toast success + keep created id
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue
      for (const part of msg.parts) {
        const normalizedPart = normalizeCreateAgentPart(part)
        if (!normalizedPart || normalizedPart.state !== "result") continue
        if (processedToolIds.current.has(normalizedPart.id)) continue
        processedToolIds.current.add(normalizedPart.id)

        const result = normalizedPart.result as CreateAgentResult
        if (!result?.success) continue

        toast.success(
          `Travers created ${result.name ?? "your agent"} successfully.`
        )
        if (result.agent_id) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCreatedAgentId(result.agent_id)
        }
      }
    }
  }, [messages])

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, acaIsLoading])

  function handleAcaSend() {
    if (!acaInput.trim() || acaIsLoading) return
    const text = acaInput.trim()
    setAcaInput("")
    sendMessage({ role: "user", parts: [{ type: "text", text }] })
  }

  function handleAcaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleAcaSend()
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required.")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required.")
      return
    }
    if (!category.trim()) {
      toast.error("Category is required.")
      return
    }
    if (!systemPrompt.trim()) {
      toast.error("System prompt is required.")
      return
    }
    setSaving(true)

    const result = await createUserAgent({
      name: name.trim(),
      icon,
      description: description.trim(),
      system_prompt: systemPrompt.trim(),
      base_model: baseModel,
      category: category.trim(),
    })
    setSaving(false)
    if ("error" in result) {
      toast.error(result.error)
      return
    }
    toast.success("Agent created successfully!")
    setIsRouteLoading(true)
    router.push(afterSavePath)
    router.refresh()
  }

  function navigateWithLoader(path: string) {
    setIsRouteLoading(true)
    router.push(path)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={afterSavePath}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm leading-none font-semibold">Create Agent</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Describe your agent to Travers and it will design and save it
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {createdAgentId ? (
            <button
              type="button"
              onClick={() =>
                navigateWithLoader(`${afterSavePath}/${createdAgentId}`)
              }
              data-testid="agent-builder-edit-agent"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/8 sm:flex-none"
            >
              Edit Agent
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                !name.trim() ||
                !description.trim() ||
                !category.trim() ||
                !systemPrompt.trim()
              }
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40 sm:flex-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              Save Agent
            </button>
          )}
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:divide-x lg:divide-border/50">
        {/* ── Left: form ── */}
        <div className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 lg:w-105 lg:py-6">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="agent-builder-name"
              placeholder="e.g. IFRS Compliance Reviewer"
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
            />
          </div>

          {/* Icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Icon
            </label>
            <div className="flex items-center gap-2">
              <AgentIconPicker value={icon} onChange={setIcon} />
              <span className="text-xs text-muted-foreground">{icon}</span>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="agent-builder-description"
              placeholder="Short description shown in agent selector"
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
              required
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="agent-builder-category"
              placeholder="e.g. Audit, Tax, Compliance"
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
              required
            />
          </div>

          {/* Base Model */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Base Model
            </label>
            <ModelPicker value={baseModel} onChange={setBaseModel} />
          </div>

          {/* System Prompt */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              System Prompt <span className="text-destructive">*</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              data-testid="agent-builder-system-prompt"
              placeholder="Travers will generate this automatically when you describe your agent on the right."
              rows={14}
              className="resize-y rounded-lg border border-border/60 bg-background px-3 py-2.5 font-mono text-xs leading-relaxed transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
            />
          </div>

          <AgentKnowledgeBaseManager agentId={createdAgentId} />
        </div>

        {/* ── Right: Travers chat ── */}
        <div className="flex min-w-0 flex-1 flex-col border-t border-border/50 lg:border-t-0">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border/50 px-5 py-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground/8 text-foreground/60">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-sm leading-none font-medium">Travers</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Describe your agent — Travers will design and create it for you.
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/6">
                  <Bot className="h-6 w-6 text-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Describe your agent to Travers
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tell Travers what the agent should do. It will ask a few
                    questions, then design and save the full agent
                    automatically.
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-1.5 text-left">
                  {[
                    "I need an agent that reviews IFRS compliance documents and flags issues",
                    "Create an agent for reviewing audit workpapers with Big 4 expertise",
                    "I want a tax advisor agent specialising in Australian corporate tax",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setAcaInput(suggestion)
                        acaInputRef.current?.focus()
                      }}
                      className="rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <AcaMessage
                    key={msg.id}
                    message={msg}
                    animate={msg.role === "assistant" && msg.id === animatingId}
                    streaming={
                      msg.role === "assistant" &&
                      msg.id === latestAssistantId &&
                      status === "streaming"
                    }
                    onView={(id) =>
                      navigateWithLoader(`${afterSavePath}/${id}`)
                    }
                  />
                ))}

                {/* Travers loading indicator — only shown before the first
                    assistant token arrives (avoids duplicate with AcaMessage content) */}
                {acaIsLoading &&
                  messages[messages.length - 1]?.role !== "assistant" && (
                    <Task open>
                      <TaskTrigger title="Travers is thinking…" />
                      <TaskContent>
                        <TaskItem
                          label="Processing your message…"
                          status="in_progress"
                        />
                      </TaskContent>
                    </Task>
                  )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border/50 px-4 py-3">
            <div
              className={cn(
                "flex items-end gap-2 rounded-xl border bg-background px-3 py-2 transition-colors",
                acaIsLoading
                  ? "border-border/40"
                  : "border-border/60 focus-within:border-foreground/30"
              )}
            >
              <textarea
                ref={acaInputRef}
                value={acaInput}
                onChange={(e) => setAcaInput(e.target.value)}
                onKeyDown={handleAcaKeyDown}
                data-testid="agent-builder-chat-input"
                placeholder="Describe your agent…"
                rows={2}
                className="min-h-0 flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50"
              />
              <button
                type="button"
                onClick={handleAcaSend}
                data-testid="agent-builder-chat-send"
                disabled={!acaInput.trim() || acaIsLoading}
                className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-xs text-muted-foreground/40">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {isRouteLoading && (
        <div className="pointer-events-none fixed inset-0 z-9999 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader size={28} className="text-foreground/70" />
        </div>
      )}
    </div>
  )
}
