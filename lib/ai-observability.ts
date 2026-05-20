import type {
  AIProviderAvailability,
  AIProviderMode,
  ResolvedAIProviderMode,
} from "@/lib/ai-provider"
import type { Json } from "@/types/supabase"

type NowFn = () => number

export type AIRequestTimingSnapshot = {
  firstTokenMs: number | null
  totalDurationMs: number
}

export function createAIRequestTimingTracker(now: NowFn = Date.now) {
  const startedAt = now()
  let firstTokenAt: number | null = null

  return {
    observeChunk(chunkType: string) {
      if (firstTokenAt !== null) return

      if (chunkType === "text-delta" || chunkType === "reasoning-delta") {
        firstTokenAt = now()
      }
    },
    snapshot(): AIRequestTimingSnapshot {
      const endedAt = now()

      return {
        firstTokenMs:
          firstTokenAt === null ? null : Math.max(firstTokenAt - startedAt, 0),
        totalDurationMs: Math.max(endedAt - startedAt, 0),
      }
    },
  }
}

type BuildAIUsageMetadataInput = {
  configuredProviderMode: AIProviderMode
  resolvedProviderMode: ResolvedAIProviderMode
  availability: AIProviderAvailability
  inputModelId?: string | null
  canonicalModelId: string
  directModelId: string
  gatewayModelId?: string | null
  timing: AIRequestTimingSnapshot
}

export function buildAIUsageMetadata({
  configuredProviderMode,
  resolvedProviderMode,
  availability,
  inputModelId = null,
  canonicalModelId,
  directModelId,
  gatewayModelId = null,
  timing,
}: BuildAIUsageMetadataInput): Json {
  const metadata = {
    rollout: {
      configuredProviderMode,
      resolvedProviderMode,
      gatewayConfigured: availability.gatewayConfigured,
      anthropicConfigured: availability.anthropicConfigured,
    },
    model: {
      inputModelId,
      canonicalModelId,
      directModelId,
      gatewayModelId,
    },
    timings: {
      firstTokenMs: timing.firstTokenMs,
      totalDurationMs: timing.totalDurationMs,
    },
  } satisfies Record<string, Json>

  return metadata
}
