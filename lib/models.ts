export type ModelId = string

export type ModelOption = {
  id: string
  family: "haiku" | "sonnet" | "opus"
  version: string
  label: string
  fullLabel: string
  description: string
  createdAt?: string
  supportsThinking?: boolean
}

type ClaudeFamily = ModelOption["family"]

type AnthropicModelInfo = {
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
}

const FAMILY_DESCRIPTIONS: Record<ClaudeFamily, string> = {
  haiku: "Fastest, lightweight tasks",
  sonnet: "Fast & highly capable — recommended",
  opus: "Most capable, complex reasoning",
}

export const FALLBACK_MODELS: ModelOption[] = [
  {
    id: "claude-haiku-4-5-20251001",
    family: "haiku",
    version: "4.5",
    label: "Haiku 4.5",
    fullLabel: "Claude Haiku 4.5",
    description: FAMILY_DESCRIPTIONS.haiku,
    supportsThinking: false,
  },
  {
    id: "claude-sonnet-4-6",
    family: "sonnet",
    version: "4.6",
    label: "Sonnet 4.6",
    fullLabel: "Claude Sonnet 4.6",
    description: FAMILY_DESCRIPTIONS.sonnet,
    supportsThinking: true,
  },
  {
    id: "claude-opus-4-6",
    family: "opus",
    version: "4.6",
    label: "Opus 4.6",
    fullLabel: "Claude Opus 4.6",
    description: FAMILY_DESCRIPTIONS.opus,
    supportsThinking: true,
  },
]

const MODEL_ID_ALIASES: Record<string, string> = {
  "claude-haiku-4-5": "claude-haiku-4-5-20251001",
}

function parseClaudeModelId(
  id: string
): { family: ClaudeFamily; version: string; dated: boolean } | null {
  // New format: claude-sonnet-4-6 or claude-sonnet-4-6-20260204
  const modern = id.match(
    /^claude-(haiku|sonnet|opus)-(\d+)-(\d{1,2})(?:-(\d{8}))?$/
  )
  if (modern) {
    const family = modern[1] as ClaudeFamily
    const major = modern[2]
    const minor = modern[3]
    const dated = Boolean(modern[4])
    return { family, version: `${major}.${minor}`, dated }
  }

  // Legacy dated format: claude-sonnet-4-20250514 (treat as major-only)
  const legacyDated = id.match(/^claude-(haiku|sonnet|opus)-(\d+)-(\d{8})$/)
  if (legacyDated) {
    const family = legacyDated[1] as ClaudeFamily
    const major = legacyDated[2]
    return { family, version: `${major}.0`, dated: true }
  }

  return null
}

function shouldPreferModel(
  candidate: ModelOption,
  current: ModelOption
): boolean {
  const candidateTime = candidate.createdAt
    ? Date.parse(candidate.createdAt)
    : 0
  const currentTime = current.createdAt ? Date.parse(current.createdAt) : 0

  if (candidateTime !== currentTime) {
    return candidateTime > currentTime
  }

  const [candidateMajor, candidateMinor] = candidate.version
    .split(".")
    .map((n) => Number(n))
  const [currentMajor, currentMinor] = current.version
    .split(".")
    .map((n) => Number(n))

  if (candidateMajor !== currentMajor) return candidateMajor > currentMajor
  if (candidateMinor !== currentMinor) return candidateMinor > currentMinor

  const candidateDated = /-\d{8}$/.test(candidate.id)
  const currentDated = /-\d{8}$/.test(current.id)
  if (candidateDated !== currentDated) return !candidateDated

  return false
}

function toModelOption(model: AnthropicModelInfo): ModelOption | null {
  const parsed = parseClaudeModelId(model.id)
  if (!parsed) return null

  const familyTitle =
    parsed.family.charAt(0).toUpperCase() + parsed.family.slice(1)
  const fullLabel = `Claude ${familyTitle} ${parsed.version}`

  return {
    id: model.id,
    family: parsed.family,
    version: parsed.version,
    label: `${familyTitle} ${parsed.version}`,
    fullLabel,
    description: FAMILY_DESCRIPTIONS[parsed.family],
    createdAt: model.created_at,
    supportsThinking:
      model.capabilities?.thinking?.supported === true &&
      model.capabilities?.thinking?.types?.adaptive?.supported === true,
  }
}

export function buildModelOptionsFromAnthropic(
  models: AnthropicModelInfo[]
): ModelOption[] {
  const byFamily = new Map<ClaudeFamily, ModelOption>()

  for (const raw of models) {
    const option = toModelOption(raw)
    if (!option) continue

    const existing = byFamily.get(option.family)
    if (!existing || shouldPreferModel(option, existing)) {
      byFamily.set(option.family, option)
    }
  }

  const familyOrder: ClaudeFamily[] = ["haiku", "sonnet", "opus"]
  return familyOrder.map((family) => {
    const live = byFamily.get(family)
    if (live) return live
    return FALLBACK_MODELS.find((m) => m.family === family)!
  })
}

export function resolveModelId(id?: string): ModelId {
  if (!id) return FALLBACK_MODELS[0].id

  const aliased = MODEL_ID_ALIASES[id]
  if (aliased) return aliased

  if (id.startsWith("claude-")) {
    return id
  }

  return FALLBACK_MODELS[0].id
}

export function supportsReasoningForModel(id?: string): boolean {
  const resolvedId = resolveModelId(id)
  const fallback = FALLBACK_MODELS.find((m) => m.id === resolvedId)
  if (typeof fallback?.supportsThinking === "boolean") {
    return fallback.supportsThinking
  }

  const parsed = parseClaudeModelId(resolvedId)
  if (!parsed) return false

  return parsed.family !== "haiku"
}

/** Returns a clean human-readable label for any model ID. */
export function getModelLabel(id: string): string {
  const resolvedId = resolveModelId(id)
  const fallback = FALLBACK_MODELS.find((m) => m.id === resolvedId)
  if (fallback) return fallback.fullLabel

  const parsed = parseClaudeModelId(resolvedId)
  if (parsed) {
    const family =
      parsed.family.charAt(0).toUpperCase() + parsed.family.slice(1)
    return `Claude ${family} ${parsed.version}`
  }

  return resolvedId
}
