import { createServiceClient } from "@/lib/supabase/service"

type LayerName = "coach" | "intelligence"

type LayerAccessValue = {
  [agentId: string]: LayerName[]
}

const BUILTIN_AGENT_LAYER_ACCESS_KEY = "builtin_agent_layer_access_v1"
const ALL_LAYERS: LayerName[] = ["coach", "intelligence"]

function normalizeLayers(raw: unknown): LayerName[] {
  if (!Array.isArray(raw)) return [...ALL_LAYERS]

  const unique = Array.from(
    new Set(
      raw.filter(
        (value): value is LayerName =>
          value === "coach" || value === "intelligence"
      )
    )
  )

  return unique.length > 0 ? unique : [...ALL_LAYERS]
}

function normalizeMapping(raw: unknown): LayerAccessValue {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {}
  }

  const mapping: LayerAccessValue = {}

  for (const [agentId, layers] of Object.entries(raw)) {
    if (typeof agentId !== "string" || agentId.length === 0) continue
    mapping[agentId] = normalizeLayers(layers)
  }

  return mapping
}

async function getMapping(): Promise<LayerAccessValue> {
  const service = createServiceClient()
  const { data } = await service
    .from("system_config")
    .select("value")
    .eq("key", BUILTIN_AGENT_LAYER_ACCESS_KEY)
    .maybeSingle<{ value: string }>()

  if (!data?.value) return {}

  try {
    return normalizeMapping(JSON.parse(data.value) as unknown)
  } catch {
    return {}
  }
}

async function saveMapping(mapping: LayerAccessValue): Promise<void> {
  const service = createServiceClient()

  await service.from("system_config").upsert(
    {
      key: BUILTIN_AGENT_LAYER_ACCESS_KEY,
      value: JSON.stringify(mapping),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )
}

export async function getBuiltinAgentLayers(
  agentId: string
): Promise<LayerName[]> {
  const mapping = await getMapping()
  return normalizeLayers(mapping[agentId])
}

export async function getBuiltinAgentLayerMap(): Promise<LayerAccessValue> {
  return getMapping()
}

export async function setBuiltinAgentLayers(
  agentId: string,
  layers: LayerName[]
): Promise<void> {
  const mapping = await getMapping()
  mapping[agentId] = normalizeLayers(layers)
  await saveMapping(mapping)
}

export async function removeBuiltinAgentLayerMapping(
  agentId: string
): Promise<void> {
  const mapping = await getMapping()
  if (!(agentId in mapping)) return

  delete mapping[agentId]
  await saveMapping(mapping)
}

export async function filterBuiltinAgentsForLayer<
  T extends { id: string; is_builtin: boolean },
>(agents: T[], layer: LayerName): Promise<T[]> {
  const mapping = await getMapping()

  return agents.filter((agent) => {
    if (!agent.is_builtin) return true

    const layers = normalizeLayers(mapping[agent.id])
    return layers.includes(layer)
  })
}
