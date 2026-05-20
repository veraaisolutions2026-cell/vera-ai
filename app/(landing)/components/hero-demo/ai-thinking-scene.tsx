"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { EASE } from "./types"

type StepKey =
  | "requirements"
  | "ifrs"
  | "materiality"
  | "controls"
  | "prompt"
  | "schema"
  | "memory"
  | "finalize"

type StepState = {
  visible: boolean
  done: boolean
}

const STEP_COPY: Record<StepKey, string> = {
  requirements: "Analysing requirements...",
  ifrs: "Parsing IFRS references and clause map...",
  materiality: "Calibrating materiality thresholds...",
  controls: "Mapping control objectives to checks...",
  prompt: "Crafting system prompt...",
  schema: "Building tool schema...",
  memory: "Attaching retrieval memory profile...",
  finalize: "Final validation and guardrails...",
}

const STEP_ORDER: StepKey[] = [
  "requirements",
  "ifrs",
  "materiality",
  "controls",
  "prompt",
  "schema",
  "memory",
  "finalize",
]

export function AiThinkingScene({ reduce }: { reduce: boolean }) {
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(
    STEP_ORDER.reduce(
      (acc, key) => ({ ...acc, [key]: { visible: false, done: false } }),
      {} as Record<StepKey, StepState>
    )
  )
  const [showDoneText, setShowDoneText] = useState(false)

  useEffect(() => {
    if (reduce) {
      setSteps(
        STEP_ORDER.reduce(
          (acc, key) => ({ ...acc, [key]: { visible: true, done: true } }),
          {} as Record<StepKey, StepState>
        )
      )
      setShowDoneText(true)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []

    const reveal = (key: StepKey, at: number) => {
      timers.push(
        setTimeout(() => {
          setSteps((prev) => ({
            ...prev,
            [key]: { ...prev[key], visible: true },
          }))
        }, at)
      )
    }

    const complete = (key: StepKey, at: number) => {
      timers.push(
        setTimeout(() => {
          setSteps((prev) => ({
            ...prev,
            [key]: { ...prev[key], done: true },
          }))
        }, at)
      )
    }

    STEP_ORDER.forEach((key, index) => {
      const revealAt = 350 + index * 520
      const completeAt = revealAt + 360
      reveal(key, revealAt)
      complete(key, completeAt)
    })

    timers.push(setTimeout(() => setShowDoneText(true), 4950))

    return () => timers.forEach(clearTimeout)
  }, [reduce])

  return (
    <div
      data-testid="demo-scene-ai-thinking"
      className="flex h-full w-full flex-col px-5 py-4"
    >
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-foreground/10 px-3.5 py-2.5 text-xs leading-relaxed text-foreground">
          I need an agent that reviews IFRS compliance documents and flags
          issues
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
        className="mt-3 rounded-2xl border border-border bg-card/70 p-3"
      >
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground/70" />
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">
            Building agent
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {STEP_ORDER.map((key) => (
            <ThinkingStep
              key={key}
              label={STEP_COPY[key]}
              visible={steps[key].visible}
              done={steps[key].done}
            />
          ))}
        </div>

        <AnimatePresence>
          {showDoneText && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="mt-3 text-xs text-foreground/75"
            >
              Done! Your Forsa agent is ready.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function ThinkingStep({
  label,
  visible,
  done,
}: {
  label: string
  visible: boolean
  done: boolean
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2.5 py-2"
        >
          {done ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
          )}
          <span className="text-[11px] text-foreground/80">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
