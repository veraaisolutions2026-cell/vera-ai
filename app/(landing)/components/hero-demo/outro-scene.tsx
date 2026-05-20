"use client"

import { motion } from "motion/react"
import { VeraLogo } from "@/components/ui/vera-logo"
import { EASE } from "./types"

// ── Scene 7 — Outro ───────────────────────────────────────────────
export function OutroScene({ reduce }: { reduce: boolean }) {
  const y = reduce ? 0 : 10
  const dur = reduce ? 0 : 0.6

  const linerWords = [
    "Every",
    "audit.",
    "Every",
    "insight.",
    "One",
    "platform.",
  ]

  return (
    <div
      data-testid="demo-scene-outro"
      className="flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: dur, ease: EASE }}
      >
        <VeraLogo width={200} height={75} variant="wide" priority={false} />
      </motion.div>

      <motion.p
        className="flex flex-wrap justify-center gap-x-[0.35em] gap-y-0 text-base text-muted-foreground"
        aria-label="Every audit. Every insight. One platform."
      >
        {linerWords.map((word, i) => (
          <motion.span
            key={word + i}
            initial={{ opacity: 0, y: reduce ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduce ? 0 : 0.48,
              ease: EASE,
              delay: reduce ? 0 : 0.35 + i * 0.07,
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, ease: EASE, delay: reduce ? 0 : 0.82 }}
      >
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-5 text-sm font-medium text-background select-none"
        >
          Try now
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 6h7M6.5 3l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </motion.div>
    </div>
  )
}
