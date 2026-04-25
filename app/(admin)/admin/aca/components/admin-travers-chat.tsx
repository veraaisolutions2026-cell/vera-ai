"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion } from "motion/react"
import { Bot, ChevronRight, Loader2, Send, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { TextEffect } from "@/components/ui/text-effect"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
  type TaskStatus,
} from "@/components/animate-ui/components/task"
import { AGENT_ICONS } from "@/lib/agent-icons"
import { cn } from "@/lib/utils"

/* ── Markdown ─────────────────────────────────────────────────── */

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
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground/70 uppercase">
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function normalizeCreatePart(part: unknown): NormalizedCreatePart | null {
  if (!isRecord(part)) return null

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

  if (part.type !== "tool-create_agent") return null

  const id =
    typeof part.toolCallId === "string"
      ? part.toolCallId
      : typeof part.id === "string"
        ? part.id
        : "create_agent"

  const stateRaw = typeof part.state === "string" ? part.state : ""
  const args = isRecord(part.input) ? part.input : {}

  if (stateRaw === "output-available")
    return { id, state: "result", args, result: part.output }
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
  if (stateRaw === "input-streaming") return { id, state: "partial-call", args }
  return { id, state: "call", args }
}

function getModelLabel(model?: string) {
  if (!model) return "Claude Sonnet"
  if (model.includes("opus")) return "Claude Opus"
  if (model.includes("haiku")) return "Claude Haiku"
  return "Claude Sonnet"
}

/* ── Animated text ──────────────────────────────────────────────── */

const CHAR_STAGGER = 0.008
const BLOCK_DUR = 0.32

type Segment = { type: "text" | "block"; content: string }

function splitIntoSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const lines = content.split("\n")
  let i = 0
  let textLines: string[] = []

  function flushText() {
    const text = textLines.join("\n").trim()
    if (text) segments.push({ type: "text", content: text })
    textLines = []
  }

  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) {
      flushText()
      const fence = line.trimStart().match(/^(```|~~~)/)?.[0] ?? "```"
      const codeLines = [line]
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith(fence)) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) {
        codeLines.push(lines[i])
        i++
      }
      segments.push({ type: "block", content: codeLines.join("\n") })
      continue
    }
    if (line.trimStart().startsWith("|")) {
      flushText()
      const tableLines = [line]
      i++
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      segments.push({ type: "block", content: tableLines.join("\n") })
      continue
    }
    textLines.push(line)
    i++
  }
  flushText()
  return segments.filter((s) => s.content.trim())
}

function isPlainText(text: string) {
  return !/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|\*\*|\*[^*\s]|__|`|\[.+\]\(|^>/m.test(
    text
  )
}

function buildAnimSegments(content: string) {
  let delay = 0.02
  return splitIntoSegments(content).map((seg) => {
    const segDelay = delay
    const plain = seg.type === "text" && isPlainText(seg.content)
    delay += plain ? seg.content.length * CHAR_STAGGER + 0.18 : BLOCK_DUR + 0.1
    return { ...seg, delay: segDelay, plain }
  })
}

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

/* ── Single message ─────────────────────────────────────────────── */

function TraversMessage({
  message,
  animate,
  streaming,
  onViewAgent,
}: {
  message: UIMessage
  animate: boolean
  streaming: boolean
  onViewAgent: (id: string) => void
}) {
  if (message.role === "user") {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("")
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-foreground/8 px-3.5 py-2.5 text-sm">
          {text}
        </div>
      </div>
    )
  }

  const textContent = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("")

  const createPart =
    message.parts
      .map((p) => normalizeCreatePart(p))
      .find((p): p is NormalizedCreatePart => p !== null) ?? null

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
      })
    : null

  const IconComponent = args?.icon ? (AGENT_ICONS[args.icon] ?? Bot) : Bot

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/8">
        <Bot className="h-3 w-3 text-foreground/50" />
      </div>
      <div className="min-w-0 flex-1">
        {textContent && (
          <AnimatedText
            text={textContent}
            animate={animate && !createPart}
            stream={streaming && !createPart}
          />
        )}

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
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 dark:text-emerald-400">
                          Done
                        </span>
                      ) : isPending ? (
                        <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[10px] text-muted-foreground">
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

                {isDone && result?.success && result.agent_id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="mt-2 flex items-center gap-2"
                  >
                    <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <button
                      onClick={() => onViewAgent(result.agent_id!)}
                      className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-foreground/8"
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

const SUGGESTIONS = [
  "I need an agent that reviews IFRS compliance documents and flags issues",
  "Create an agent for reviewing audit workpapers with Big 4 expertise",
  "I want a tax advisor agent specialising in Australian corporate tax",
]

export function AdminTraversChat() {
  const router = useRouter()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const processedToolIds = useRef(new Set<string>())

  const [input, setInput] = useState("")
  const [animatingId, setAnimatingId] = useState<string | null>(null)
  const lastAnimatedIdRef = useRef<string | null>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/agent-builder/chat" }),
  })

  const isLoading = status === "submitted" || status === "streaming"
  const assistantMessages = messages.filter((m) => m.role === "assistant")
  const latestAssistantId =
    assistantMessages[assistantMessages.length - 1]?.id ?? null

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

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue
      for (const part of msg.parts) {
        const normalized = normalizeCreatePart(part)
        if (!normalized || normalized.state !== "result") continue
        if (processedToolIds.current.has(normalized.id)) continue
        processedToolIds.current.add(normalized.id)
        const result = normalized.result as CreateAgentResult
        if (!result?.success) continue
        toast.success(
          `Travers created ${result.name ?? "your agent"} successfully.`
        )
      }
    }
  }, [messages])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading])

  function handleSend() {
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput("")
    sendMessage({ role: "user", parts: [{ type: "text", text }] })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function navigateTo(path: string) {
    router.push(path)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-foreground/4">
              <Sparkles className="h-6 w-6 text-foreground/40" />
            </div>
            <div className="max-w-sm">
              <p className="text-sm font-medium">Use Travers to build agents</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Describe what you want the agent to do. Travers will design the
                system prompt, select the right model, and save the agent
                automatically.
              </p>
            </div>
            <div className="mt-1 flex w-full max-w-md flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setInput(s)
                    inputRef.current?.focus()
                  }}
                  className="rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-6 py-5">
            {messages.map((msg) => (
              <TraversMessage
                key={msg.id}
                message={msg}
                animate={msg.role === "assistant" && msg.id === animatingId}
                streaming={
                  msg.role === "assistant" &&
                  msg.id === latestAssistantId &&
                  status === "streaming"
                }
                onViewAgent={(id) => navigateTo(`/admin/agents/${id}`)}
              />
            ))}

            {isLoading &&
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
      <div className="shrink-0 border-t border-border/50 px-6 py-4">
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border bg-background px-3 py-2 transition-colors",
            isLoading
              ? "border-border/40"
              : "border-border/60 focus-within:border-foreground/30"
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the agent you want Travers to build…"
            rows={1}
            disabled={isLoading}
            className="min-h-[36px] flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
            style={{ maxHeight: "160px", overflowY: "auto" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
          Travers will create the agent and save it to{" "}
          <button
            type="button"
            onClick={() => navigateTo("/admin/agents")}
            className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
          >
            Agents
          </button>
        </p>
      </div>
    </div>
  )
}
