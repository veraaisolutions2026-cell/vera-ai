"use client"

import { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import {
  SCENE_ORDER,
  SCENE_DURATIONS,
  SCENE_TRANSITION,
  type Scene,
} from "./types"
import { DemoCursor } from "./cursor"
import { IntroScene, ReducedMotionStatic } from "./intro-scene"
import { OutroScene } from "./outro-scene"
import { TabUiScene } from "./tab-ui-scene"
import { AgentBuilderScene } from "./agent-builder-scene"
import { AiThinkingScene } from "./ai-thinking-scene"
import { AgentResultScene } from "./agent-result-scene"
import { ChatTransitionScene } from "./chat-transition-scene"
import { ChatDemoScene } from "./chat-demo-scene"

// ── Main component ────────────────────────────────────────────────
export function HeroDemo() {
  const reduceMotion = useReducedMotion()
  const reduce = reduceMotion ?? false

  const [scene, setScene] = useState<Scene>("intro")
  const [cursor, setCursor] = useState({ x: 0, y: 0, clicking: false })
  const containerRef = useRef<HTMLDivElement>(null)

  // Scene advancement - fires after each scene's duration
  useEffect(() => {
    if (reduce) return

    const duration = SCENE_DURATIONS[scene]
    const timer = setTimeout(() => {
      const idx = SCENE_ORDER.indexOf(scene)
      const next = SCENE_ORDER[(idx + 1) % SCENE_ORDER.length]
      setScene(next)
    }, duration)

    return () => clearTimeout(timer)
  }, [scene, reduce])

  // Reduced-motion: show static final state, no transitions
  if (reduce) {
    return (
      <div aria-hidden="true" className="relative h-full w-full bg-background">
        <ReducedMotionStatic />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="hero-demo"
      className="relative h-full w-full bg-background"
    >
      <AnimatePresence mode="wait">
        {scene === "intro" && (
          <motion.div
            key="intro"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <IntroScene reduce={reduce} />
          </motion.div>
        )}

        {scene === "tab-ui" && (
          <motion.div
            key="tab-ui"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <TabUiScene
              reduce={reduce}
              containerRef={containerRef}
              onCursor={setCursor}
            />
          </motion.div>
        )}

        {scene === "agent-builder" && (
          <motion.div
            key="agent-builder"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <AgentBuilderScene
              reduce={reduce}
              containerRef={containerRef}
              onCursor={setCursor}
            />
          </motion.div>
        )}

        {scene === "ai-thinking" && (
          <motion.div
            key="ai-thinking"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <AiThinkingScene reduce={reduce} />
          </motion.div>
        )}

        {scene === "agent-result" && (
          <motion.div
            key="agent-result"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <AgentResultScene reduce={reduce} />
          </motion.div>
        )}

        {scene === "chat-transition" && (
          <motion.div
            key="chat-transition"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <ChatTransitionScene reduce={reduce} />
          </motion.div>
        )}

        {scene === "chat-demo" && (
          <motion.div
            key="chat-demo"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <ChatDemoScene
              reduce={reduce}
              containerRef={containerRef}
              onCursor={setCursor}
            />
          </motion.div>
        )}

        {scene === "outro" && (
          <motion.div
            key="outro"
            className="absolute inset-0"
            {...SCENE_TRANSITION}
          >
            <OutroScene reduce={reduce} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cursor - only visible during interactive scenes */}
      <DemoCursor
        x={cursor.x}
        y={cursor.y}
        clicking={cursor.clicking}
        visible={
          scene === "tab-ui" ||
          scene === "agent-builder" ||
          scene === "chat-demo"
        }
      />
    </div>
  )
}
