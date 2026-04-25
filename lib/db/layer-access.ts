import { cache } from "react"
import { getBillingPlan, type PlanId } from "@/lib/billing-plans"
import { isAdminUnlimitedModeEnabled } from "@/lib/db/admin-unlimited-mode"
import { getLayerCapabilities } from "@/lib/db/layer-capabilities"
import { createServiceClient } from "@/lib/supabase/service"

type ProfileRole = "admin" | "user" | "viewer"
type LayerName = "coach" | "intelligence"

export type LayerAccess = {
  role: ProfileRole
  plan: PlanId
  layer: LayerName
  allowBuiltInAgents: boolean
  allowCustomAgentCrud: boolean
  allowKnowledgeBaseManagement: boolean
}

function getLayerName(plan: PlanId): LayerName {
  return plan === "vera-intelligence" ? "intelligence" : "coach"
}

async function getUserRoleAndPlan(userId: string): Promise<{
  role: ProfileRole
  plan: PlanId
}> {
  const service = createServiceClient()

  const [profileResult, subscriptionResult] = await Promise.all([
    service
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle<{ role: ProfileRole }>(),
    service
      .from("subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle<{ plan: string | null }>(),
  ])

  const role = profileResult.data?.role ?? "user"
  const plan = getBillingPlan(subscriptionResult.data?.plan).id

  return { role, plan }
}

const getUserLayerAccessCached = cache(async (userId: string) => {
  const [{ role, plan }, capabilityConfig, isAdminUnlimitedMode] =
    await Promise.all([
      getUserRoleAndPlan(userId),
      getLayerCapabilities(),
      isAdminUnlimitedModeEnabled(userId),
    ])

  if (role === "admin" && isAdminUnlimitedMode) {
    return {
      role,
      plan,
      layer: "intelligence" as const,
      allowBuiltInAgents: true,
      allowCustomAgentCrud: true,
      allowKnowledgeBaseManagement: true,
    }
  }

  const layer = getLayerName(plan)
  const layerConfig = capabilityConfig.value[layer]

  // Vera Coach is intentionally hard-limited regardless of mutable capability config.
  const isCoachPlan = plan === "vera-coach"

  return {
    role,
    plan,
    layer,
    allowBuiltInAgents: layerConfig.allowBuiltInAgents,
    allowCustomAgentCrud: isCoachPlan
      ? false
      : layerConfig.allowCustomAgentCrud,
    allowKnowledgeBaseManagement: isCoachPlan
      ? false
      : layerConfig.allowKnowledgeBaseManagement,
  }
})

export async function getUserLayerAccess(userId: string): Promise<LayerAccess> {
  return getUserLayerAccessCached(userId)
}
