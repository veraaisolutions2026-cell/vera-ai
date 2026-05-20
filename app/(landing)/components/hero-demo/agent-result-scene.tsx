"use client"

import { motion } from "motion/react"
import { ArrowRight, Search } from "lucide-react"
import { EASE } from "./types"

export function AgentResultScene({ reduce }: { reduce: boolean }) {
  return (
    <div
      data-testid="demo-scene-agent-result"
      className="flex h-full w-full items-center justify-center px-6"
    >
      <div className="w-full max-w-90">
        <motion.p
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0 : 0.28,
            ease: EASE,
            delay: reduce ? 0 : 0.2,
          }}
          className="mb-2 text-center text-[11px] tracking-wide text-muted-foreground/70 uppercase"
        >
          Agent created
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <motion.div
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: "120%", opacity: [0, 0.35, 0] }}
            transition={{
              duration: reduce ? 0 : 0.9,
              ease: EASE,
              delay: reduce ? 0 : 0.8,
            }}
            className="pointer-events-none absolute inset-y-0 w-24 bg-linear-to-r from-transparent via-background/40 to-transparent"
          />

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
            Reviews IFRS disclosures, highlights risk signals, and maps findings
            to audit-ready recommendations.
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="rounded-full border border-border bg-background px-2 py-1 text-[10px] text-muted-foreground">
              Model: Vera Pro
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium text-background">
              Chat now
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
