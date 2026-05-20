"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, Search } from "lucide-react"
import { getElCenter, EASE } from "./types"

type Segment =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "quote"; text: string }

const USER_PROMPT = "What are the top 3 compliance risks in this contract?"

const REPLY_SEGMENTS: Segment[] = [
  { kind: "text", text: "Here are the " },
  { kind: "strong", text: "top 3 compliance risks" },
  { kind: "text", text: " identified:\n\n" },
  { kind: "strong", text: "1. Indemnification Clause (§8.3)" },
  {
    kind: "text",
    text: "\nThe current wording places unlimited liability on your organisation. Recommend capping at contract value.\n\n",
  },
  { kind: "strong", text: "2. Data Residency (§12.1)" },
  {
    kind: "text",
    text: "\nNo restriction on cross-border data transfers. May breach Australian Privacy Act obligations.\n\n",
  },
  { kind: "strong", text: "3. Termination Notice (§15)" },
  {
    kind: "text",
    text: "\nOnly 7-day notice required for immediate termination. Industry standard is 30 days minimum.\n\n",
  },
  { kind: "quote", text: "Recommend legal review before execution." },
]

const CHAR_STAGGER_MS = 8
const BLOCK_STAGGER_MS = 320

export function ChatDemoScene({
  reduce,
  containerRef,
  onCursor,
}: {
  reduce: boolean
  containerRef: { current: Element | null }
  onCursor: (s: { x: number; y: number; clicking: boolean }) => void
}) {
  const [showCard, setShowCard] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const chatNowRef = useRef<HTMLButtonElement>(null)

  const [typedText, setTypedText] = useState<string[]>(() =>
    REPLY_SEGMENTS.map(() => "")
  )
  const [visibleBlocks, setVisibleBlocks] = useState<boolean[]>(() =>
    REPLY_SEGMENTS.map(() => false)
  )

  const fullPlainReply = useMemo(() => {
    return REPLY_SEGMENTS.map((segment) => segment.text).join("")
  }, [])

  useEffect(() => {
    if (reduce) {
      setShowCard(false)
      setShowPanel(true)
      setShowUser(true)
      setShowAssistant(true)
      setTypedText(
        REPLY_SEGMENTS.map((segment) =>
          segment.kind === "text" ? segment.text : ""
        )
      )
      setVisibleBlocks(REPLY_SEGMENTS.map((segment) => segment.kind !== "text"))
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []

    // Cursor appears and clicks "Chat now" on the created agent card.
    timers.push(
      setTimeout(() => {
        const cR = containerRef.current?.getBoundingClientRect()
        if (!cR) return
        onCursor({ x: cR.width * 0.16, y: cR.height * 0.8, clicking: false })
      }, 320)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(chatNowRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 1300)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(chatNowRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: true })
      }, 2100)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(chatNowRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 2260)
    )

    timers.push(setTimeout(() => setShowPanel(true), 2700))
    timers.push(setTimeout(() => setShowCard(false), 2820))

    timers.push(setTimeout(() => setShowUser(true), 3300))
    timers.push(setTimeout(() => setShowAssistant(true), 4300))

    let cursorMs = 0

    REPLY_SEGMENTS.forEach((segment, segmentIndex) => {
      if (segment.kind === "text") {
        for (let i = 1; i <= segment.text.length; i++) {
          const count = i
          timers.push(
            setTimeout(
              () => {
                setTypedText((prev) => {
                  const next = [...prev]
                  next[segmentIndex] = segment.text.slice(0, count)
                  return next
                })
              },
              4300 + cursorMs + count * CHAR_STAGGER_MS
            )
          )
        }
        cursorMs += segment.text.length * CHAR_STAGGER_MS
      } else {
        timers.push(
          setTimeout(
            () => {
              setVisibleBlocks((prev) => {
                const next = [...prev]
                next[segmentIndex] = true
                return next
              })
            },
            4300 + cursorMs + BLOCK_STAGGER_MS
          )
        )
        cursorMs += BLOCK_STAGGER_MS
      }
    })

    return () => timers.forEach(clearTimeout)
  }, [reduce, containerRef, onCursor])

  return (
    <div
      data-testid="demo-scene-chat-demo"
      className="flex h-full w-full items-center justify-center px-5"
    >
      <AnimatePresence mode="wait">
        {showCard && (
          <motion.div
            key="forsa-card"
            data-testid="demo-chat-demo-card"
            initial={{
              opacity: 0,
              y: reduce ? 0 : 16,
              scale: reduce ? 1 : 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8, scale: reduce ? 1 : 0.99 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            className="w-full max-w-97.5 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background">
                <Search className="h-3.5 w-3.5 text-foreground/70" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Forsa</p>
                <p className="text-[11px] text-muted-foreground">
                  IFRS Reviewing Agent
                </p>
              </div>
            </div>

            <p className="rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs leading-relaxed text-foreground/80">
              Reviews IFRS disclosures, highlights risk signals, and maps
              findings to audit-ready recommendations.
            </p>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
                Model: Vera Pro
              </span>
              <button
                ref={chatNowRef}
                type="button"
                tabIndex={-1}
                className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium text-background"
              >
                Chat now
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}

        {showPanel && (
          <motion.div
            key="chat-panel"
            data-testid="demo-chat-demo-panel"
            initial={{
              opacity: 0,
              y: reduce ? 0 : 10,
              scale: reduce ? 1 : 0.96,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
            className="flex h-[92%] w-full max-w-97.5 flex-col overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background">
                  <Search className="h-3 w-3 text-foreground/70" />
                </div>
                <span className="text-xs font-medium text-foreground">
                  Forsa
                </span>
              </div>
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                Vera Pro
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-3.5 py-3">
              {showUser && (
                <motion.div
                  data-testid="demo-chat-demo-user"
                  initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
                  className="flex justify-end"
                >
                  <div className="max-w-[86%] rounded-2xl rounded-tr-sm bg-foreground/10 px-3 py-2 text-xs leading-relaxed text-foreground">
                    {USER_PROMPT}
                  </div>
                </motion.div>
              )}

              {showAssistant && (
                <motion.div
                  data-testid="demo-chat-demo-assistant"
                  initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
                  className="max-w-[92%] rounded-2xl rounded-tl-sm border border-border bg-background px-3 py-2.5"
                >
                  <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    Forsa
                  </p>

                  <div className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/85">
                    {REPLY_SEGMENTS.map((segment, index) => {
                      if (segment.kind === "text") {
                        return (
                          <span key={`text-${index}`}>{typedText[index]}</span>
                        )
                      }

                      if (!visibleBlocks[index] && !reduce) {
                        return null
                      }

                      if (segment.kind === "strong") {
                        return (
                          <span
                            key={`strong-${index}`}
                            className="font-semibold text-foreground"
                          >
                            {segment.text}
                          </span>
                        )
                      }

                      return (
                        <span
                          key={`quote-${index}`}
                          className="block border-l-2 border-border pl-2 text-foreground/75 italic"
                        >
                          {segment.text}
                        </span>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="border-t border-border px-3 py-2.5">
              <div className="h-2 rounded-full bg-foreground/6" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="sr-only" data-testid="demo-chat-demo-full-reply">
        {fullPlainReply}
      </p>
    </div>
  )
}
