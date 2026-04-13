"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Document as PdfDocument,
  Page,
  StyleSheet,
  Text,
  pdf,
} from "@react-pdf/renderer"
import { AnimatePresence, motion } from "motion/react"
import { Download, FileCode2, FileText, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { useChatTitleState } from "@/hooks/use-chat-title-state"

type ChatHeaderMessage = {
  role: "user" | "assistant"
  content: string
}

type Props = {
  chatId: string
  initialTitle: string
  messages: ChatHeaderMessage[]
}

const FORMATS = [
  { id: "pdf", label: "PDF document", icon: FileText },
  { id: "md", label: "Markdown", icon: FileCode2 },
  { id: "txt", label: "Plain text", icon: FileText },
] as const

const pdfStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    lineHeight: 1.45,
    color: "#111827",
  },
  title: {
    fontSize: 16,
    marginBottom: 14,
  },
  section: {
    marginBottom: 10,
  },
  role: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  content: {
    fontSize: 11,
  },
})

function normalizeTitle(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return "Untitled"
  const firstLine = trimmed.split("\n")[0]?.trim() ?? ""
  if (!firstLine) return "Untitled"
  return firstLine.length > 56
    ? `${firstLine.slice(0, 56).trimEnd()}...`
    : firstLine
}

function buildTitleSeed(messages: ChatHeaderMessage[]): string {
  const hasAssistant = messages.some(
    (message) => message.role === "assistant" && message.content.trim()
  )
  if (!hasAssistant) return ""

  const userMessages = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean)

  if (!userMessages.length) return ""

  return userMessages.slice(0, 3).join("\n\n").slice(0, 1800)
}

function isPlaceholderTitle(value: string): boolean {
  const normalized = value.trim()
  return !normalized || normalized === "New chat" || normalized === "Untitled"
}

function sanitizeFileName(title: string): string {
  return (
    title
      .trim()
      .replace(/[^a-zA-Z0-9\s_-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || "untitled"
  )
}

function toText(messages: ChatHeaderMessage[]): string {
  return messages
    .map(
      (m) => `${m.role === "user" ? "User" : "Assistant"}:\n${m.content.trim()}`
    )
    .join("\n\n")
    .trim()
}

function toMarkdown(messages: ChatHeaderMessage[], title: string): string {
  const body = messages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant"
      return `## ${role}\n\n${m.content.trim()}`
    })
    .join("\n\n")

  return `# ${title}\n\n${body}`.trim()
}

function ChatPdf({
  title,
  messages,
}: {
  title: string
  messages: ChatHeaderMessage[]
}) {
  return (
    <PdfDocument>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{title}</Text>
        {messages.map((m, idx) => (
          <Text key={`${m.role}-${idx}`} style={pdfStyles.section}>
            <Text style={pdfStyles.role}>
              {m.role === "user" ? "User" : "Assistant"}
            </Text>
            {"\n"}
            <Text style={pdfStyles.content}>{m.content.trim()}</Text>
          </Text>
        ))}
      </Page>
    </PdfDocument>
  )
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ChatHeader({ chatId, initialTitle, messages }: Props) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [title, setTitle] = useState<string>("Untitled")
  const [isTitleLoading, setIsTitleLoading] = useState(false)
  const completedSeedRef = useRef("")
  const titleAttemptsRef = useRef<Record<string, number>>({})
  const sharedTitle = useChatTitleState((state) => state.titles[chatId])
  const setSharedTitle = useChatTitleState((state) => state.setTitle)
  const setSharedLoading = useChatTitleState((state) => state.setLoading)

  const titleSeed = useMemo(() => buildTitleSeed(messages), [messages])
  const baseFile = useMemo(() => sanitizeFileName(title), [title])

  useEffect(() => {
    if (sharedTitle?.trim()) {
      setTitle(sharedTitle)
    }
  }, [sharedTitle])

  useEffect(() => {
    const existingTitle = (sharedTitle?.trim() || initialTitle.trim()) ?? ""

    if (!isPlaceholderTitle(existingTitle)) {
      const normalizedExisting = normalizeTitle(existingTitle)
      completedSeedRef.current = titleSeed
      setTitle(normalizedExisting)
      setIsTitleLoading(false)
      setSharedTitle(chatId, normalizedExisting)
      setSharedLoading(chatId, false)
      return
    }

    if (!titleSeed) {
      completedSeedRef.current = ""
      setTitle("Untitled")
      setIsTitleLoading(false)
      setSharedLoading(chatId, false)
      return
    }

    if (completedSeedRef.current === titleSeed) return

    const attempts = titleAttemptsRef.current[titleSeed] ?? 0
    if (attempts >= 2) {
      setIsTitleLoading(false)
      setSharedLoading(chatId, false)
      return
    }
    titleAttemptsRef.current[titleSeed] = attempts + 1

    const controller = new AbortController()
    setIsTitleLoading(true)
    setSharedLoading(chatId, true)

    async function loadTitle() {
      try {
        const res = await fetch("/api/chat/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed: titleSeed, chatId }),
          signal: controller.signal,
        })

        if (!res.ok) throw new Error("Title generation failed")

        const payload = (await res.json()) as { title?: string }
        const nextTitle = normalizeTitle(payload.title ?? "Untitled")
        completedSeedRef.current = titleSeed
        delete titleAttemptsRef.current[titleSeed]
        setTitle(nextTitle)
        setSharedTitle(chatId, nextTitle)
      } catch {
        if (!controller.signal.aborted) {
          setTitle("Untitled")
          setSharedTitle(chatId, "Untitled")
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTitleLoading(false)
          setSharedLoading(chatId, false)
        }
      }
    }

    void loadTitle()

    return () => controller.abort()
  }, [
    chatId,
    initialTitle,
    setSharedLoading,
    setSharedTitle,
    sharedTitle,
    titleSeed,
  ])

  async function handleExport(fmt: (typeof FORMATS)[number]["id"]) {
    if (!messages.length) return
    setExporting(fmt)

    try {
      if (fmt === "txt") {
        const txt = toText(messages)
        downloadBlob(
          new Blob([txt], { type: "text/plain;charset=utf-8" }),
          `${baseFile}.txt`
        )
        return
      }

      if (fmt === "md") {
        const md = toMarkdown(messages, title)
        downloadBlob(
          new Blob([md], { type: "text/markdown;charset=utf-8" }),
          `${baseFile}.md`
        )
        return
      }

      const blob = await pdf(
        <ChatPdf title={title} messages={messages} />
      ).toBlob()
      downloadBlob(blob, `${baseFile}.pdf`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
      <div className="max-w-[58vw] overflow-hidden sm:max-w-xs">
        {isTitleLoading ? (
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={title || "Untitled"}
              className="truncate text-sm font-medium text-foreground"
              initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {title || "Untitled"}
            </motion.h1>
          </AnimatePresence>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!messages.length}
            className="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-muted data-[state=open]:text-foreground"
            aria-label="Export conversation"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {FORMATS.map((format) => {
            const Icon = format.icon
            const isLoading = exporting === format.id
            return (
              <DropdownMenuItem
                key={format.id}
                disabled={Boolean(exporting)}
                onClick={() => void handleExport(format.id)}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span>{format.label}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
