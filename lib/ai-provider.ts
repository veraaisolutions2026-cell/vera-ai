import { gateway } from "ai"

const AI_PROVIDER_MODES = ["gateway"] as const

export type AIProviderMode = (typeof AI_PROVIDER_MODES)[number]
export type ResolvedAIProviderMode = AIProviderMode

export type GatewayModelReference = {
  gatewayModelId?: string
  fallbackGatewayModelIds?: string[]
}

export type AIProviderAvailability = {
  gatewayConfigured: boolean
}

export type GatewayRoutingOptions = {
  models?: string[]
}

export type ResolvedGatewayProviderContext = {
  languageModel: ReturnType<typeof gateway>
  configuredProviderMode: AIProviderMode
  resolvedProviderMode: ResolvedAIProviderMode
  availability: AIProviderAvailability
  gatewayProviderOptions?: GatewayRoutingOptions
}

function isAIProviderMode(value: string): value is AIProviderMode {
  return AI_PROVIDER_MODES.includes(value as AIProviderMode)
}

function hasGatewayApiKey(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
}

function getGatewayModelId(reference: GatewayModelReference): string {
  const gatewayModelId = reference.gatewayModelId?.trim()
  if (gatewayModelId) {
    return gatewayModelId
  }

  throw new Error("Gateway mode requires an explicit Gateway model ID.")
}

function getGatewayFallbackModelIds(
  reference: GatewayModelReference
): string[] {
  return (reference.fallbackGatewayModelIds ?? [])
    .map((modelId) => modelId.trim())
    .filter(Boolean)
}

export function getAIProviderAvailability(): AIProviderAvailability {
  return {
    gatewayConfigured: hasGatewayApiKey(),
  }
}

function getAIProviderMode(): AIProviderMode {
  const configuredMode = process.env.VERA_AI_PROVIDER_MODE?.trim()

  if (configuredMode && isAIProviderMode(configuredMode)) {
    return configuredMode
  }

  return "gateway"
}

function resolveGatewayProviderMode(
  reference: GatewayModelReference
): ResolvedAIProviderMode {
  const mode = getAIProviderMode()
  const availability = getAIProviderAvailability()

  if (!availability.gatewayConfigured) {
    throw new Error(
      "AI_GATEWAY_API_KEY is not configured. Vera AI now requires Vercel AI Gateway for all model requests."
    )
  }

  getGatewayModelId(reference)
  return mode
}

export function resolveGatewayLanguageModel(reference: GatewayModelReference) {
  return resolveGatewayProviderContext(reference).languageModel
}

export function resolveGatewayProviderContext(
  reference: GatewayModelReference
): ResolvedGatewayProviderContext {
  const configuredProviderMode = getAIProviderMode()
  const availability = getAIProviderAvailability()
  const providerMode = resolveGatewayProviderMode(reference)
  const fallbackGatewayModelIds = getGatewayFallbackModelIds(reference)

  return {
    languageModel: gateway(getGatewayModelId(reference)),
    configuredProviderMode,
    resolvedProviderMode: providerMode,
    availability,
    gatewayProviderOptions:
      fallbackGatewayModelIds.length > 0
        ? {
            models: fallbackGatewayModelIds,
          }
        : undefined,
  }
}
