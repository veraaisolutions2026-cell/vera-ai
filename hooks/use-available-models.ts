"use client"

import { useCallback, useEffect, useState } from "react"
import { FALLBACK_MODELS, type ModelOption } from "@/lib/models"

type ModelsApiResponse = {
  models?: ModelOption[]
}

const MODELS_CACHE_KEY = "vera_models_cache_v1"
const MODELS_CACHE_TTL_MS = 60_000

type ModelsCache = {
  savedAt: number
  models: ModelOption[]
}

export function useAvailableModels() {
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const shouldUseCache = refreshCount === 0
      if (shouldUseCache) {
        try {
          const raw = sessionStorage.getItem(MODELS_CACHE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as ModelsCache
            if (
              parsed?.models?.length &&
              Date.now() - parsed.savedAt < MODELS_CACHE_TTL_MS
            ) {
              if (!cancelled) setModels(parsed.models)
              return
            }
          }
        } catch {
          // Ignore cache parse issues.
        }
      }

      try {
        const res = await fetch("/api/models", { cache: "no-store" })
        if (!res.ok) return

        const payload = (await res.json()) as ModelsApiResponse
        const next = payload.models ?? []
        if (!cancelled && next.length > 0) {
          setModels(next)
          try {
            const cacheValue: ModelsCache = {
              savedAt: Date.now(),
              models: next,
            }
            sessionStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(cacheValue))
          } catch {
            // Ignore cache write issues.
          }
        }
      } catch {
        // Keep fallback models on transient errors.
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [refreshCount])

  const refresh = useCallback(() => {
    setRefreshCount((value) => value + 1)
  }, [])

  return { models, refresh }
}
