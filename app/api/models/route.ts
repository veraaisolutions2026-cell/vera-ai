import { NextResponse } from "next/server"
import {
  buildModelOptionsFromAnthropic,
  FALLBACK_MODELS,
  type ModelOption,
} from "@/lib/models"

type AnthropicListModelsResponse = {
  data?: Array<{
    id: string
    created_at?: string
    display_name?: string
    capabilities?: {
      thinking?: {
        supported?: boolean
        types?: {
          adaptive?: { supported?: boolean }
        }
      }
    }
  }>
}

const MODELS_CACHE_TTL_MS = 5 * 60 * 1000
const MODEL_LIST_RESPONSE_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
} as const

type CachedModelsPayload = {
  expiresAt: number
  models: ModelOption[]
}

let cachedModelsPayload: CachedModelsPayload | null = null
let cachedModelsPromise: Promise<ModelOption[]> | null = null

async function fetchAnthropicModels(apiKey: string): Promise<ModelOption[]> {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    return FALLBACK_MODELS
  }

  const payload = (await res.json()) as AnthropicListModelsResponse
  const parsed = buildModelOptionsFromAnthropic(payload.data ?? [])

  return parsed.length === 0 ? FALLBACK_MODELS : parsed
}

async function getCachedModels(apiKey: string): Promise<ModelOption[]> {
  const now = Date.now()

  if (cachedModelsPayload && cachedModelsPayload.expiresAt > now) {
    return cachedModelsPayload.models
  }

  if (cachedModelsPromise) {
    return cachedModelsPromise
  }

  cachedModelsPromise = fetchAnthropicModels(apiKey)
    .then((models) => {
      cachedModelsPayload = {
        models,
        expiresAt: Date.now() + MODELS_CACHE_TTL_MS,
      }

      return models
    })
    .catch(() => FALLBACK_MODELS)
    .finally(() => {
      cachedModelsPromise = null
    })

  return cachedModelsPromise
}

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { models: FALLBACK_MODELS },
      { headers: MODEL_LIST_RESPONSE_HEADERS }
    )
  }

  try {
    const models = await getCachedModels(apiKey)
    return NextResponse.json(
      { models },
      { headers: MODEL_LIST_RESPONSE_HEADERS }
    )
  } catch {
    return NextResponse.json(
      { models: FALLBACK_MODELS },
      { headers: MODEL_LIST_RESPONSE_HEADERS }
    )
  }
}
