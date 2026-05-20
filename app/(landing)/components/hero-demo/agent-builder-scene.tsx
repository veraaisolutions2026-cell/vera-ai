"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowLeft,
  FileSearch,
  ClipboardList,
  FileText,
  PenLine,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EASE, getElCenter } from "./types"

// ── Templates — these are the real starter prompts ────────────────
// Travers is an agent, NOT a template. Templates are plain-language
// descriptions that the user types to build a new agent.
const TEMPLATES = [
  {
    Icon: FileSearch,
    label: "IFRS Compliance Review",
    fullText:
      "I need an agent that reviews IFRS compliance documents and flags issues",
  },
  {
    Icon: ClipboardList,
    label: "Audit Workpaper Review",
    fullText:
      "Create an agent for reviewing audit workpapers with Big 4 expertise",
  },
  {
    Icon: FileText,
    label: "Australian Tax Advisor",
    fullText:
      "I want a tax advisor agent specialising in Australian corporate tax",
  },
] as const

type Template = (typeof TEMPLATES)[number]

// ── Scene 2 — Agent Builder ───────────────────────────────────────
// No window chrome. Clean builder header + template cards + composer.
// Cursor clicks the first template, input fills via typewriter,
// then cursor moves to Send and the message bubble appears.
export function AgentBuilderScene({
  reduce,
  containerRef,
  onCursor,
}: {
  reduce: boolean
  containerRef: { current: Element | null }
  onCursor: (s: { x: number; y: number; clicking: boolean }) => void
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [inputText, setInputText] = useState("")
  const [messageSent, setMessageSent] = useState(false)

  const firstCardRef = useRef<HTMLDivElement>(null)
  const sendButtonRef = useRef<HTMLButtonElement>(null)

  const TYPING_TEXT = TEMPLATES[0].fullText

  useEffect(() => {
    if (reduce) return
    const timers: ReturnType<typeof setTimeout>[] = []

    // Cursor moves from top (where it was after tab click) down to first card
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(firstCardRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 500)
    )

    // Click first template card
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(firstCardRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: true })
      }, 1700)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(firstCardRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
        setSelectedIdx(0)
      }, 1900)
    )

    // Typewriter fills input: starts at 2100ms, 40ms per char
    const TYPING_START = 2100
    const CHAR_DELAY = 40
    for (let i = 1; i <= TYPING_TEXT.length; i++) {
      const idx = i
      timers.push(
        setTimeout(
          () => setInputText(TYPING_TEXT.slice(0, idx)),
          TYPING_START + idx * CHAR_DELAY
        )
      )
    }
    // Typing complete at ~2100 + 70*40 = 4900ms

    // Cursor moves to Send
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(sendButtonRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 5100)
    )

    // Click Send
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(sendButtonRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: true })
      }, 6000)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(sendButtonRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
        setMessageSent(true)
      }, 6200)
    )

    return () => timers.forEach(clearTimeout)
  }, [reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      data-testid="demo-scene-agent-builder"
      className="flex h-full w-full flex-col"
    >
      {/* Minimal header — no window chrome */}
      <div className="flex shrink-0 items-center gap-2.5 px-5 py-4">
        <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/40" />
        <PenLine className="h-3.5 w-3.5 text-muted-foreground/40" />
        <span className="text-sm font-medium text-foreground">New Agent</span>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {!messageSent ? (
            <motion.div
              key="builder"
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* Template cards */}
              <div className="flex-1 overflow-auto px-5 pb-3">
                <p className="mb-2.5 text-[10px] font-semibold tracking-widest text-muted-foreground/40 uppercase">
                  Start with a template
                </p>

                <div className="flex flex-col gap-2">
                  {TEMPLATES.map((tmpl, i) => (
                    <TemplateCard
                      key={tmpl.label}
                      tmpl={tmpl}
                      selected={selectedIdx === i}
                      cardRef={i === 0 ? firstCardRef : undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Composer */}
              <div className="shrink-0 border-t border-border px-4 py-3">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3.5 py-2.5">
                  <span className="flex-1 truncate text-xs">
                    {inputText ? (
                      <span className="text-foreground/80">{inputText}</span>
                    ) : (
                      <span className="text-muted-foreground/35">
                        Describe the agent you want to build…
                      </span>
                    )}
                  </span>
                  <button
                    ref={sendButtonRef}
                    type="button"
                    tabIndex={-1}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors",
                      inputText.length > 0
                        ? "bg-foreground text-background"
                        : "bg-foreground/6 text-muted-foreground/25"
                    )}
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex flex-1 flex-col px-5 py-4"
            >
              {/* User message bubble */}
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-foreground/10 px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
                  {TYPING_TEXT}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Template card ─────────────────────────────────────────────────
// Inspired by clean bordered pill cards: icon left, label right.
// Selected state uses a subtle foreground tint — no amber/color.
function TemplateCard({
  tmpl,
  selected,
  cardRef,
}: {
  tmpl: Template
  selected: boolean
  cardRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        "flex cursor-default items-center gap-3 rounded-full border px-4 py-2.5 transition-all duration-200",
        selected
          ? "border-foreground/20 bg-foreground/5"
          : "border-border bg-background"
      )}
    >
      <tmpl.Icon
        className={cn(
          "h-4 w-4 shrink-0",
          selected ? "text-foreground/60" : "text-muted-foreground/40"
        )}
      />
      <span
        className={cn(
          "truncate text-xs font-medium",
          selected ? "text-foreground/80" : "text-muted-foreground/60"
        )}
      >
        {tmpl.label}
      </span>
    </div>
  )
}
