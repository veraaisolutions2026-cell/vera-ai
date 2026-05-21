// ── Hero Demo - shared types & constants ──────────────────────────

export const EASE = [0.16, 1, 0.3, 1] as const

export type Scene =
  | "intro"
  | "tab-ui"
  | "agent-builder"
  | "ai-thinking"
  | "agent-result"
  | "chat-transition"
  | "chat-demo"
  | "outro"

export const SCENE_ORDER: Scene[] = [
  "intro",
  "tab-ui",
  "agent-builder",
  "ai-thinking",
  "agent-result",
  "chat-transition",
  "chat-demo",
  "outro",
]

/** How long each scene stays on screen (ms) before transitioning away */
export const SCENE_DURATIONS: Record<Scene, number> = {
  intro: 3500,
  "tab-ui": 5000,
  "agent-builder": 7000,
  "ai-thinking": 6000,
  "agent-result": 4500,
  "chat-transition": 4000,
  "chat-demo": 10000,
  outro: 4000,
}

/**
 * Default scene wrapper transition.
 * Scenes enter by sliding down from above, exit by sliding down out of view.
 * This creates a "scroll through time" feel as the demo progresses.
 */
export const SCENE_TRANSITION = {
  initial: { opacity: 0, y: -14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 14 },
  transition: { duration: 0.38, ease: EASE },
} as const

/** Computes the center of an element relative to the demo container */
export function getElCenter(
  elRef: { current: Element | null },
  containerRef: { current: Element | null }
): { x: number; y: number } {
  const el = elRef.current
  const container = containerRef.current
  if (!el || !container) return { x: 0, y: 0 }
  const eR = el.getBoundingClientRect()
  const cR = container.getBoundingClientRect()
  return {
    x: eR.left - cR.left + eR.width / 2,
    y: eR.top - cR.top + eR.height / 2,
  }
}
