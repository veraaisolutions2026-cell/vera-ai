import {
  getSystemConfigWithMeta,
  setSystemConfig,
} from "@/lib/db/system-config"

const LAYER_CAPABILITIES_KEY = "layer_capabilities_v1"

export type LayerCapabilities = {
  coach: {
    allowBuiltInAgents: boolean
    allowCustomAgentCrud: boolean
    allowKnowledgeBaseManagement: boolean
  }
  intelligence: {
    allowBuiltInAgents: boolean
    allowCustomAgentCrud: boolean
    allowKnowledgeBaseManagement: boolean
  }
}

const DEFAULT_LAYER_CAPABILITIES: LayerCapabilities = {
  coach: {
    allowBuiltInAgents: true,
    allowCustomAgentCrud: false,
    allowKnowledgeBaseManagement: false,
  },
  intelligence: {
    allowBuiltInAgents: true,
    allowCustomAgentCrud: true,
    allowKnowledgeBaseManagement: true,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function normalizeLayerCapabilities(raw: unknown): LayerCapabilities {
  if (!isRecord(raw)) return DEFAULT_LAYER_CAPABILITIES

  const coach = isRecord(raw.coach) ? raw.coach : {}
  const intelligence = isRecord(raw.intelligence) ? raw.intelligence : {}

  return {
    coach: {
      allowBuiltInAgents: parseBoolean(
        coach.allowBuiltInAgents,
        DEFAULT_LAYER_CAPABILITIES.coach.allowBuiltInAgents
      ),
      allowCustomAgentCrud: parseBoolean(
        coach.allowCustomAgentCrud,
        DEFAULT_LAYER_CAPABILITIES.coach.allowCustomAgentCrud
      ),
      allowKnowledgeBaseManagement: parseBoolean(
        coach.allowKnowledgeBaseManagement,
        DEFAULT_LAYER_CAPABILITIES.coach.allowKnowledgeBaseManagement
      ),
    },
    intelligence: {
      allowBuiltInAgents: parseBoolean(
        intelligence.allowBuiltInAgents,
        DEFAULT_LAYER_CAPABILITIES.intelligence.allowBuiltInAgents
      ),
      allowCustomAgentCrud: parseBoolean(
        intelligence.allowCustomAgentCrud,
        DEFAULT_LAYER_CAPABILITIES.intelligence.allowCustomAgentCrud
      ),
      allowKnowledgeBaseManagement: parseBoolean(
        intelligence.allowKnowledgeBaseManagement,
        DEFAULT_LAYER_CAPABILITIES.intelligence.allowKnowledgeBaseManagement
      ),
    },
  }
}

export async function getLayerCapabilities(): Promise<{
  value: LayerCapabilities
  updatedAt: string | null
}> {
  const config = await getSystemConfigWithMeta(LAYER_CAPABILITIES_KEY)

  if (!config?.value) {
    return {
      value: DEFAULT_LAYER_CAPABILITIES,
      updatedAt: null,
    }
  }

  try {
    const parsed = JSON.parse(config.value) as unknown

    return {
      value: normalizeLayerCapabilities(parsed),
      updatedAt: config.updated_at,
    }
  } catch {
    return {
      value: DEFAULT_LAYER_CAPABILITIES,
      updatedAt: config.updated_at,
    }
  }
}

export async function updateLayerCapabilities(
  value: LayerCapabilities
): Promise<void> {
  await setSystemConfig(LAYER_CAPABILITIES_KEY, JSON.stringify(value))
}
