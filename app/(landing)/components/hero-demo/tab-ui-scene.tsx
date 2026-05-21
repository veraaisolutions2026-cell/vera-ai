"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "motion/react"
import { Bot, FileSpreadsheet, HandCoins, Landmark } from "lucide-react"
import {
  Tabs,
  TabsList,
  TabsHighlight,
  TabsHighlightItem,
  TabsTrigger,
  TabsContent,
} from "@/components/animate-ui/primitives/radix/tabs"
import { cn } from "@/lib/utils"
import { EASE, getElCenter } from "./types"

// ── Scene 1 - Tab UI ──────────────────────────────────────────────
// No window chrome. Just a pill segmented control that the cursor
// clicks to switch from "Chat" to "Agents", revealing agent cards.
export function TabUiScene({
  reduce,
  containerRef,
  onCursor,
}: {
  reduce: boolean
  containerRef: { current: Element | null }
  onCursor: (s: { x: number; y: number; clicking: boolean }) => void
}) {
  const [activeTab, setActiveTab] = useState<"chat" | "agents">("chat")
  // Wrapping div for cursor targeting - getBoundingClientRect works on the div
  const agentsTabWrapRef = useRef<HTMLDivElement>(null)
  const traversPillRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (reduce) return
    const timers: ReturnType<typeof setTimeout>[] = []

    // Cursor appears lower-left after scene slides in
    timers.push(
      setTimeout(() => {
        const cR = containerRef.current?.getBoundingClientRect()
        if (!cR) return
        onCursor({ x: cR.width * 0.1, y: cR.height * 0.8, clicking: false })
      }, 300)
    )

    // Cursor travels toward the Agents tab
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(agentsTabWrapRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 800)
    )

    // Cursor arrives, clicks
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(agentsTabWrapRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: true })
      }, 2200)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(agentsTabWrapRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
        setActiveTab("agents")
      }, 2400)
    )

    // After tab switch, cursor moves to Travers creator pill and clicks it
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(traversPillRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 3150)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(traversPillRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: true })
      }, 3950)
    )
    timers.push(
      setTimeout(() => {
        const pos = getElCenter(traversPillRef, containerRef)
        onCursor({ x: pos.x, y: pos.y, clicking: false })
      }, 4120)
    )

    return () => timers.forEach(clearTimeout)
  }, [reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      data-testid="demo-scene-tab-ui"
      className="flex h-full w-full flex-col items-center justify-center gap-8 px-6"
    >
      {/* Pill segmented control using animate-ui Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "chat" | "agents")}
        className="w-full"
      >
        {/* Tab bar */}
        <div className="flex justify-center">
          <TabsHighlight
            className="absolute inset-0 z-0 rounded-full bg-white shadow-sm"
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <TabsList className="relative inline-flex h-9 items-stretch justify-center gap-0 rounded-full border border-border bg-foreground/6 p-1">
              <TabsHighlightItem
                value="chat"
                className="flex h-full items-stretch"
              >
                <TabsTrigger
                  value="chat"
                  className="relative z-10 flex h-full items-center rounded-full px-6 text-sm font-medium transition-colors duration-300 data-[state=active]:text-black data-[state=inactive]:text-muted-foreground"
                >
                  Chat
                </TabsTrigger>
              </TabsHighlightItem>

              {/* Wrapping div carries the ref for cursor positioning */}
              <div ref={agentsTabWrapRef} className="flex h-full items-stretch">
                <TabsHighlightItem
                  value="agents"
                  className="flex h-full items-stretch"
                >
                  <TabsTrigger
                    value="agents"
                    className="relative z-10 flex h-full items-center rounded-full px-6 text-sm font-medium transition-colors duration-300 data-[state=active]:text-black data-[state=inactive]:text-muted-foreground"
                  >
                    Agents
                  </TabsTrigger>
                </TabsHighlightItem>
              </div>
            </TabsList>
          </TabsHighlight>
        </div>

        {/* Content area */}
        <div className="mt-6 w-full">
          <TabsContent
            value="chat"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChatContent />
          </TabsContent>

          <TabsContent
            value="agents"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <AgentsContent traversPillRef={traversPillRef} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// ── Chat tab content - blurred conversation placeholder ───────────
function ChatContent() {
  return (
    <div className="flex flex-col gap-3">
      {/* Message rows alternating left/right */}
      {[
        { w: 72, align: "end" },
        { w: 58, align: "start" },
        { w: 80, align: "start" },
        { w: 48, align: "end" },
        { w: 66, align: "start" },
      ].map((row, i) => (
        <div
          key={i}
          className={cn(
            "flex",
            row.align === "end" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className="h-2.5 rounded-full bg-foreground/8"
            style={{ width: `${row.w}%` }}
          />
        </div>
      ))}
      {/* Input bar */}
      <div className="mt-2 flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2.5">
        <div className="h-2 flex-1 rounded-full bg-foreground/6" />
        <div className="h-6 w-6 rounded-full bg-foreground/8" />
      </div>
    </div>
  )
}

// ── Agents tab content - mini agent card grid ─────────────────────
function AgentsContent({
  traversPillRef,
}: {
  traversPillRef: React.RefObject<HTMLButtonElement | null>
}) {
  const agents = [
    { Icon: Landmark, name: "AASB 16 Copilot" },
    { Icon: HandCoins, name: "Financial Instruments Copilot" },
    { Icon: FileSpreadsheet, name: "Financial statements Copilot" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex flex-col gap-3"
    >
      <div className="mb-0.5">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/45 uppercase">
          MasterHub
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {agents.map((a) => (
          <div
            key={a.name}
            className="flex items-center gap-2.5 rounded-full border border-border bg-background px-3.5 py-2"
          >
            <a.Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/55" />
            <span className="truncate text-xs font-medium text-foreground/80">
              {a.name}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground/60 uppercase">
          OR
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button
        ref={traversPillRef}
        type="button"
        tabIndex={-1}
        className="flex w-full items-center gap-2.5 rounded-full border border-border bg-background px-3.5 py-2 text-left"
      >
        <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <span className="truncate text-xs font-medium text-foreground/80">
          Travers - Describe your agent and travers will design and create it
          for you.
        </span>
      </button>
    </motion.div>
  )
}
