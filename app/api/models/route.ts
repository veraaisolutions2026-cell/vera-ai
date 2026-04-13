import { NextResponse } from "next/server"
import { buildModelOptionsFromAnthropic, FALLBACK_MODELS } from "@/lib/models"

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

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ models: FALLBACK_MODELS })
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json({ models: FALLBACK_MODELS })
    }

    const payload = (await res.json()) as AnthropicListModelsResponse
    const parsed = buildModelOptionsFromAnthropic(payload.data ?? [])

    if (parsed.length === 0) {
      return NextResponse.json({ models: FALLBACK_MODELS })
    }

    return NextResponse.json({ models: parsed })
  } catch {
    return NextResponse.json({ models: FALLBACK_MODELS })
  }
}
