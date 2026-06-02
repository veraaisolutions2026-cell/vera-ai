export type ModelId = string
export type GatewayModelId = string

export type ModelOption = {
  id: string
  gatewayModelId: GatewayModelId
  fallbackGatewayModelIds: GatewayModelId[]
  family: "haiku" | "sonnet" | "opus"
  version: string
  label: string
  fullLabel: string
  description: string
  createdAt?: string
  supportsThinking?: boolean
}

type ClaudeFamily = ModelOption["family"]

const MODEL_ID_WITH_PROVIDER_PREFIX = /^[a-z0-9-]+\//i

const FAMILY_LABELS: Record<ClaudeFamily, string> = {
  haiku: "Vera Mini",
  sonnet: "Vera Pro",
  opus: "Vera Max",
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
    gatewayModelId: "anthropic/claude-haiku-4.5",
    fallbackGatewayModelIds: ["google/gemini-3.1-flash-lite"],
    family: "haiku",
    version: "4.5",
    label: FAMILY_LABELS.haiku,
    fullLabel: FAMILY_LABELS.haiku,
    description: FAMILY_DESCRIPTIONS.haiku,
    supportsThinking: false,
  },
  {
    id: "claude-sonnet-4.6",
    gatewayModelId: "anthropic/claude-sonnet-4.6",
    fallbackGatewayModelIds: ["google/gemini-3.5-flash"],
    family: "sonnet",
    version: "4.6",
    label: FAMILY_LABELS.sonnet,
    fullLabel: FAMILY_LABELS.sonnet,
    description: FAMILY_DESCRIPTIONS.sonnet,
    supportsThinking: true,
  },
  {
    id: "claude-opus-4.8",
    gatewayModelId: "anthropic/claude-opus-4.8",
    fallbackGatewayModelIds: ["google/gemini-3.1-pro-preview"],
    family: "opus",
    version: "4.8",
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
    [model.gatewayModelId, model.id],
    ...model.fallbackGatewayModelIds.map(
      (gatewayModelId) => [gatewayModelId, model.id] as const
    ),
  ])
)

MODEL_ID_ALIASES["claude-haiku-4-5"] = "claude-haiku-4.5"
MODEL_ID_ALIASES["claude-sonnet-4-6"] = "claude-sonnet-4.6"
MODEL_ID_ALIASES["claude-opus-4-6"] = "claude-opus-4.8"
MODEL_ID_ALIASES["claude-opus-4.6"] = "claude-opus-4.8"
MODEL_ID_ALIASES["google/gemini-2.5-flash-lite"] = "claude-haiku-4.5"
MODEL_ID_ALIASES["google/gemini-2.5-flash"] = "claude-sonnet-4.6"
MODEL_ID_ALIASES["google/gemini-2.5-pro"] = "claude-opus-4.8"

export const TITLE_GENERATION_MODEL_ID = "claude-haiku-4.5" as const
export const AGENT_BUILDER_MODEL_ID = "claude-sonnet-4.6" as const
export const AGENT_BASE_MODEL_IDS = [
  AGENT_BUILDER_MODEL_ID,
  "claude-haiku-4.5",
  "claude-opus-4.8",
] as const

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

export function normalizeModelId(id?: string): ModelId {
  if (!id?.trim()) return DEFAULT_CHAT_MODEL_ID

  const trimmed = id.trim()
  const directMatch = MODEL_ID_ALIASES[trimmed]
  if (directMatch) return directMatch

  const stripped = stripAnthropicProviderPrefix(trimmed)
  const strippedMatch = MODEL_ID_ALIASES[stripped]
  if (strippedMatch) return strippedMatch

  const parsed = parseClaudeModelId(trimmed)
  if (parsed) {
    return (
      FALLBACK_MODELS.find((model) => model.family === parsed.family)?.id ??
      toCanonicalModelId(parsed.family, parsed.version)
    )
  }

  return stripped
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

export function getModelOption(id?: string): ModelOption | undefined {
  return getFallbackModelOption(id)
}

export function resolveGatewayModelId(id?: string): GatewayModelId {
  const matched = getFallbackModelOption(id)
  if (matched) {
    return matched.gatewayModelId
  }

  const normalizedId = normalizeModelId(id)
  return MODEL_ID_WITH_PROVIDER_PREFIX.test(normalizedId)
    ? normalizedId
    : toGatewayAnthropicModelId(normalizedId)
}

export function resolveGatewayFallbackModelIds(id?: string): GatewayModelId[] {
  return getFallbackModelOption(id)?.fallbackGatewayModelIds ?? []
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
