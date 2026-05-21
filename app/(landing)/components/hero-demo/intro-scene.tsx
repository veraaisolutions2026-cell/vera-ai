"use client"

import { motion } from "motion/react"
import { VeraLogo } from "@/components/ui/vera-logo"
import { EASE } from "./types"

// ── Scene 0 - Intro ───────────────────────────────────────────────
export function IntroScene({ reduce }: { reduce: boolean }) {
  const y = reduce ? 0 : 14
  const dur = reduce ? 0 : 0.65

  return (
    <div
      data-testid="demo-scene-intro"
      className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 0.86 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: dur, ease: EASE }}
      >
        <VeraLogo width={200} height={75} variant="wide" priority={false} />
      </motion.div>

      <div className="flex flex-col items-center -space-y-1">
        <motion.p
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease: EASE, delay: reduce ? 0 : 0.42 }}
          className="text-[58px] leading-[0.95] font-semibold tracking-tight text-foreground"
        >
          Audit faster.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease: EASE, delay: reduce ? 0 : 0.68 }}
          className="text-[58px] leading-[0.95] font-semibold tracking-tight text-foreground/40"
        >
          Think clearer.
        </motion.p>
      </div>
    </div>
  )
}

// ── Reduced-motion static view ────────────────────────────────────
// Shows the outro as a frozen final state - no loops, no timers.
export function ReducedMotionStatic() {
  return (
    <div
      data-testid="demo-scene-outro"
      className="flex h-full w-full flex-col items-center justify-center gap-6 px-8 text-center"
    >
      <VeraLogo width={200} height={75} variant="wide" priority={false} />
      <p className="text-base text-muted-foreground">
        Every audit. Every insight. One platform.
      </p>
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
    </div>
  )
}
