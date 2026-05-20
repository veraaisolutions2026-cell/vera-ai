"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Search } from "lucide-react"
import { EASE } from "./types"

const TAGLINE = "Your AI audit agent, deployed."

export function ChatTransitionScene({ reduce }: { reduce: boolean }) {
  const words = TAGLINE.split(" ")
  const [showTagline, setShowTagline] = useState(true)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    if (reduce) {
      setShowTagline(false)
      setShowPanel(true)
      return
    }

    const hideText = setTimeout(() => setShowTagline(false), 2000)
    const showChat = setTimeout(() => setShowPanel(true), 2500)

    return () => {
      clearTimeout(hideText)
      clearTimeout(showChat)
    }
  }, [reduce])

  return (
    <div
      data-testid="demo-scene-chat-transition"
      className="flex h-full w-full items-center justify-center px-6"
    >
      <AnimatePresence mode="wait">
        {showTagline && (
          <motion.p
            key="tagline"
            data-testid="demo-chat-transition-tagline"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            className="max-w-85 text-center text-[28px] leading-tight font-semibold tracking-tight text-foreground"
          >
            {words.map((word, i) => (
              <motion.span
                key={word + i}
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduce ? 0 : 0.42,
                  ease: EASE,
                  delay: reduce ? 0 : 0.2 + i * 0.08,
                }}
                className="mr-[0.3em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </motion.p>
        )}

        {showPanel && (
          <motion.div
            key="panel"
            data-testid="demo-chat-transition-panel"
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
            className="w-full max-w-92.5 overflow-hidden rounded-2xl border border-border bg-card"
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
            <div className="h-45 bg-background/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
