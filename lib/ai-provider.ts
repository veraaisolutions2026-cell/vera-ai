import { anthropic } from "@ai-sdk/anthropic"
import { gateway } from "ai"

const AI_PROVIDER_MODES = ["gateway", "direct-anthropic", "fallback"] as const

export type AIProviderMode = (typeof AI_PROVIDER_MODES)[number]
export type ResolvedAIProviderMode = Exclude<AIProviderMode, "fallback">

export type AnthropicModelReference = {
  directModelId: string
  gatewayModelId?: string
}

export type AIProviderAvailability = {
  gatewayConfigured: boolean
  anthropicConfigured: boolean
}

export type ResolvedAnthropicProviderContext = {
  languageModel: ReturnType<typeof gateway> | ReturnType<typeof anthropic>
  configuredProviderMode: AIProviderMode
  resolvedProviderMode: ResolvedAIProviderMode
  availability: AIProviderAvailability
}

function isAIProviderMode(value: string): value is AIProviderMode {
  return AI_PROVIDER_MODES.includes(value as AIProviderMode)
}

function hasGatewayApiKey(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
}

function hasAnthropicApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
}

function getGatewayModelId(reference: AnthropicModelReference): string {
  const gatewayModelId = reference.gatewayModelId?.trim()
  if (gatewayModelId) {
    return gatewayModelId
  }

  throw new Error(
    "Gateway mode requires an explicit Gateway model ID. Complete Prompt 2 model normalization before switching VERA_AI_PROVIDER_MODE to gateway."
  )
}

export function getAIProviderAvailability(): AIProviderAvailability {
  return {
    gatewayConfigured: hasGatewayApiKey(),
    anthropicConfigured: hasAnthropicApiKey(),
  }
}

function getAIProviderMode(): AIProviderMode {
  const configuredMode = process.env.VERA_AI_PROVIDER_MODE?.trim()

  if (configuredMode && isAIProviderMode(configuredMode)) {
    return configuredMode
  }

  return "direct-anthropic"
}

function resolveAnthropicProviderMode(
  reference: AnthropicModelReference
): ResolvedAIProviderMode {
  const mode = getAIProviderMode()
  const availability = getAIProviderAvailability()

  if (mode === "gateway") {
    if (!availability.gatewayConfigured) {
      throw new Error(
        "VERA_AI_PROVIDER_MODE is set to gateway but AI_GATEWAY_API_KEY is not configured."
      )
    }

    getGatewayModelId(reference)
    return "gateway"
  }

  if (mode === "direct-anthropic") {
    if (!availability.anthropicConfigured) {
      throw new Error(
        "VERA_AI_PROVIDER_MODE is set to direct-anthropic but ANTHROPIC_API_KEY is not configured."
      )
    }

    return "direct-anthropic"
  }

  if (availability.gatewayConfigured && reference.gatewayModelId?.trim()) {
    return "gateway"
  }

  if (availability.anthropicConfigured) {
    return "direct-anthropic"
  }

  throw new Error(
    "Fallback provider mode could not resolve a usable provider. Configure ANTHROPIC_API_KEY or AI_GATEWAY_API_KEY before enabling migrated routes."
  )
}

export function resolveAnthropicLanguageModel(
  reference: AnthropicModelReference
) {
  return resolveAnthropicProviderContext(reference).languageModel
}

export function resolveAnthropicProviderContext(
  reference: AnthropicModelReference
): ResolvedAnthropicProviderContext {
  const configuredProviderMode = getAIProviderMode()
  const availability = getAIProviderAvailability()
  const providerMode = resolveAnthropicProviderMode(reference)

  if (providerMode === "gateway") {
    return {
      languageModel: gateway(getGatewayModelId(reference)),
      configuredProviderMode,
      resolvedProviderMode: providerMode,
      availability,
    }
  }

  return {
    languageModel: anthropic(reference.directModelId),
    configuredProviderMode,
    resolvedProviderMode: providerMode,
    availability,
  }
}
