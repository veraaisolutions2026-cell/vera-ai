import { NextResponse } from "next/server"
import { FALLBACK_MODELS } from "@/lib/models"

const MODEL_LIST_RESPONSE_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
} as const

export async function GET() {
  return NextResponse.json(
    { models: FALLBACK_MODELS },
    { headers: MODEL_LIST_RESPONSE_HEADERS }
  )
}
