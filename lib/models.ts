export type ModelId = string
export type DirectModelId = string
export type GatewayModelId = string

export type ModelOption = {
  id: string
  directModelId: DirectModelId
  gatewayModelId: GatewayModelId
  family: "haiku" | "sonnet" | "opus"
  version: string
  label: string
  fullLabel: string
  description: string
  createdAt?: string
  supportsThinking?: boolean
}

type ClaudeFamily = ModelOption["family"]

const FAMILY_LABELS: Record<ClaudeFamily, string> = {
  haiku: "Vera Mini",
  sonnet: "Vera Pro",
  opus: "Vera Max",
}

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
  haiku: "Fastest for lightweight tasks",
  sonnet: "Balanced speed and reasoning - recommended",
  opus: "Most capable for complex reasoning",
}

function toCanonicalModelId(family: ClaudeFamily, version: string): ModelId {
  return `claude-${family}-${version}`
}

function toGatewayAnthropicModelId(id: ModelId): GatewayModelId {
  return `anthropic/${id}`
}

function stripAnthropicProviderPrefix(id: string): string {
  return id.startsWith("anthropic/") ? id.slice("anthropic/".length) : id
}

export const FALLBACK_MODELS: ModelOption[] = [
  {
    id: "claude-haiku-4.5",
    directModelId: "claude-haiku-4-5-20251001",
    gatewayModelId: "anthropic/claude-haiku-4.5",
    family: "haiku",
    version: "4.5",
    label: FAMILY_LABELS.haiku,
    fullLabel: FAMILY_LABELS.haiku,
    description: FAMILY_DESCRIPTIONS.haiku,
    supportsThinking: false,
  },
  {
    id: "claude-sonnet-4.6",
    directModelId: "claude-sonnet-4-6",
    gatewayModelId: "anthropic/claude-sonnet-4.6",
    family: "sonnet",
    version: "4.6",
    label: FAMILY_LABELS.sonnet,
    fullLabel: FAMILY_LABELS.sonnet,
    description: FAMILY_DESCRIPTIONS.sonnet,
    supportsThinking: true,
  },
  {
    id: "claude-opus-4.6",
    directModelId: "claude-opus-4-6",
    gatewayModelId: "anthropic/claude-opus-4.6",
    family: "opus",
    version: "4.6",
    label: FAMILY_LABELS.opus,
    fullLabel: FAMILY_LABELS.opus,
    description: FAMILY_DESCRIPTIONS.opus,
    supportsThinking: true,
  },
]

export const DEFAULT_CHAT_MODEL_ID =
  FALLBACK_MODELS.find((model) => model.family === "sonnet")?.id ??
  FALLBACK_MODELS[0].id

const DEFAULT_FALLBACK_MODEL = FALLBACK_MODELS[0]

const MODEL_ID_ALIASES: Record<string, string> = Object.fromEntries(
  FALLBACK_MODELS.flatMap((model) => [
    [model.id, model.id],
    [model.directModelId, model.id],
    [model.gatewayModelId, model.id],
  ])
)

MODEL_ID_ALIASES["claude-haiku-4-5"] = "claude-haiku-4.5"

function parseClaudeModelId(
  id: string
): { family: ClaudeFamily; version: string; dated: boolean } | null {
  const normalizedId = stripAnthropicProviderPrefix(id)

  const canonical = normalizedId.match(
    /^claude-(haiku|sonnet|opus)-(\d+)\.(\d{1,2})$/
  )
  if (canonical) {
    const family = canonical[1] as ClaudeFamily
    const major = canonical[2]
    const minor = canonical[3]
    return { family, version: `${major}.${minor}`, dated: false }
  }

  // New format: claude-sonnet-4-6 or claude-sonnet-4-6-20260204
  const modern = normalizedId.match(
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
  const legacyDated = normalizedId.match(
    /^claude-(haiku|sonnet|opus)-(\d+)-(\d{8})$/
  )
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

  const candidateDated = /-\d{8}$/.test(candidate.directModelId)
  const currentDated = /-\d{8}$/.test(current.directModelId)
  if (candidateDated !== currentDated) return !candidateDated

  return false
}

function toModelOption(model: AnthropicModelInfo): ModelOption | null {
  const parsed = parseClaudeModelId(model.id)
  if (!parsed) return null

  const brandedLabel = FAMILY_LABELS[parsed.family]
  const canonicalId = toCanonicalModelId(parsed.family, parsed.version)

  return {
    id: canonicalId,
    directModelId: stripAnthropicProviderPrefix(model.id),
    gatewayModelId: toGatewayAnthropicModelId(canonicalId),
    family: parsed.family,
    version: parsed.version,
    label: brandedLabel,
    fullLabel: brandedLabel,
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

export function normalizeModelId(id?: string): ModelId {
  if (!id?.trim()) return DEFAULT_CHAT_MODEL_ID

  const trimmed = id.trim()
  const directMatch = MODEL_ID_ALIASES[trimmed]
  if (directMatch) return directMatch

  const stripped = stripAnthropicProviderPrefix(trimmed)
  const strippedMatch = MODEL_ID_ALIASES[stripped]
  if (strippedMatch) return strippedMatch

  const parsed = parseClaudeModelId(trimmed)
  if (!parsed) return stripped

  return toCanonicalModelId(parsed.family, parsed.version)
}

export function areEquivalentModelIds(
  leftId?: string,
  rightId?: string
): boolean {
  return normalizeModelId(leftId) === normalizeModelId(rightId)
}

function getFallbackModelOption(id?: string): ModelOption | undefined {
  const normalizedId = normalizeModelId(id)
  return FALLBACK_MODELS.find((model) => model.id === normalizedId)
}

function toDirectAnthropicModelId(id: ModelId): DirectModelId {
  const matched = getFallbackModelOption(id)
  if (matched) {
    return matched.directModelId
  }

  const parsed = parseClaudeModelId(id)
  if (!parsed) return stripAnthropicProviderPrefix(id)

  const normalizedVersion = parsed.version.replace(".", "-")
  return `claude-${parsed.family}-${normalizedVersion}`
}

export function resolveGatewayModelId(id?: string): GatewayModelId {
  const matched = getFallbackModelOption(id)
  if (matched) {
    return matched.gatewayModelId
  }

  const normalizedId = normalizeModelId(id)
  return normalizedId.startsWith("anthropic/")
    ? normalizedId
    : toGatewayAnthropicModelId(normalizedId)
}

export function resolveModelId(id?: string): ModelId {
  if (!id?.trim()) return DEFAULT_FALLBACK_MODEL.directModelId

  const matched = getFallbackModelOption(id)
  if (matched) {
    return matched.directModelId
  }

  return toDirectAnthropicModelId(normalizeModelId(id))
}

export function supportsReasoningForModel(id?: string): boolean {
  const normalizedId = normalizeModelId(id)
  const fallback = FALLBACK_MODELS.find((m) => m.id === normalizedId)
  if (typeof fallback?.supportsThinking === "boolean") {
    return fallback.supportsThinking
  }

  const parsed = parseClaudeModelId(normalizedId)
  if (!parsed) return false

  return parsed.family !== "haiku"
}

/** Returns a clean human-readable label for any model ID. */
export function getModelLabel(id?: string): string {
  if (!id?.trim()) {
    return DEFAULT_FALLBACK_MODEL.fullLabel
  }

  const normalizedId = normalizeModelId(id)
  const fallback = FALLBACK_MODELS.find((m) => m.id === normalizedId)
  if (fallback) return fallback.fullLabel

  const parsed = parseClaudeModelId(normalizedId)
  if (parsed) {
    return FAMILY_LABELS[parsed.family]
  }

  return stripAnthropicProviderPrefix(id)
}
