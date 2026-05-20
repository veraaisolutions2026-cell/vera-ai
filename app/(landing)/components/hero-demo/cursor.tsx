"use client"

import { AnimatePresence, motion } from "motion/react"

// ── Demo cursor ───────────────────────────────────────────────────
// Smaller macOS-style arrow cursor with off-white stroke and drop shadow
// for visibility on both light and dark backgrounds.
export function DemoCursor({
  x,
  y,
  clicking,
  visible,
}: {
  x: number
  y: number
  clicking: boolean
  visible: boolean
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cursor"
          data-testid="demo-cursor"
          className="pointer-events-none absolute top-0 left-0 z-50 will-change-transform"
          initial={{ opacity: 0, x, y }}
          animate={{ opacity: 1, x, y, scale: clicking ? 0.8 : 1 }}
          exit={{ opacity: 0 }}
          transition={{
            x: { type: "spring", stiffness: 130, damping: 24 },
            y: { type: "spring", stiffness: 130, damping: 24 },
            scale: { duration: 0.1 },
            opacity: { duration: 0.25 },
          }}
        >
          <svg
            width="22"
            height="27"
            viewBox="0 0 22 27"
            fill="none"
            aria-hidden="true"
            style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.32))" }}
          >
            {/*
              Single path with paintOrder="stroke fill":
              stroke (#d0d0d0 off-white) paints behind black fill,
              giving clean visibility on both light and dark backgrounds.
            */}
            <path
              d="M2 1.5L2 21.5L7 17L10 24L13.5 22.5L10.5 15.5L17.5 15.5Z"
              fill="black"
              stroke="#d0d0d0"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              paintOrder="stroke fill"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
