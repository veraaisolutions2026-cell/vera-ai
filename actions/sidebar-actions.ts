"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getUserLayerAccess } from "@/lib/db/layer-access"

const favoriteAgentIdsSchema = z.array(z.string().uuid()).max(24)

export async function updateFavoriteAgents(favoriteAgentIds: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" as const }
  }

  const parsed = favoriteAgentIdsSchema.safeParse(favoriteAgentIds)
  if (!parsed.success) {
    return { error: "Invalid favorite agents" as const }
  }

  const dedupedFavoriteAgentIds = Array.from(new Set(parsed.data))

  const [layerAccess, agentsResult] = await Promise.all([
    getUserLayerAccess(user.id),
    supabase
      .from("agents")
      .select("id, is_builtin, user_id")
      .in("id", dedupedFavoriteAgentIds),
  ])

  const availableAgents = (agentsResult.data ?? []).filter((agent) => {
    if (agent.is_builtin) {
      return layerAccess.allowBuiltInAgents
    }

    return layerAccess.allowCustomAgentCrud && agent.user_id === user.id
  })

  const availableAgentIds = new Set(availableAgents.map((agent) => agent.id))
  const nextFavoriteAgentIds = dedupedFavoriteAgentIds.filter((agentId) =>
    availableAgentIds.has(agentId)
  )

  const { error } = await supabase
    .from("profiles")
    .update({
      favorite_agent_ids: nextFavoriteAgentIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { error: "Failed to save favorite agents" as const }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/agents")

  return {
    success: true as const,
    favoriteAgentIds: nextFavoriteAgentIds,
  }
}
