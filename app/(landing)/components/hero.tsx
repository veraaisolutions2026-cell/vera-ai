"use client"

import { motion, useReducedMotion } from "motion/react"
import { HeroAuthCard } from "./hero-auth-card"
import { HeroDemo } from "./hero-demo"

const EASE = [0.16, 1, 0.3, 1] as const

export function Hero() {
  const reduce = useReducedMotion()
  const y = reduce ? 0 : 28
  const dur = reduce ? 0 : 0.72

  return (
    <section
      aria-label="hero"
      className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-4 pt-2 pb-4 sm:px-6 lg:flex-row lg:items-stretch lg:gap-16"
    >
      {/* Left column — copy */}
      <div className="flex w-full flex-col items-center justify-center text-center lg:w-1/2">
        <motion.h1
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease: EASE }}
          className="mb-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl xl:text-6xl"
        >
          Audit faster.
          <br />
          <span className="text-foreground/40">Think clearer.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease: EASE, delay: reduce ? 0 : 0.1 }}
          className="mb-8 text-base text-muted-foreground sm:text-lg"
        >
          Chat with agents. Close audits faster.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur, ease: EASE, delay: reduce ? 0 : 0.22 }}
          className="w-full max-w-sm"
        >
          <HeroAuthCard />
        </motion.div>
      </div>

      {/* Right column — video */}
      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: reduce ? 0 : 0.85,
          ease: EASE,
          delay: reduce ? 0 : 0.08,
        }}
        className="flex w-full items-center justify-center lg:w-1/2"
      >
        <div className="w-full max-w-sm rounded-2xl lg:max-w-none">
          <div className="relative aspect-1080/1238 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-[0_4px_32px_0_rgb(0,0,0,0.08)]">
            <HeroDemo />
          </div>
        </div>
      </motion.div>
    </section>
  )
}
