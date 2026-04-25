"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserLayerAccess } from "@/lib/db/layer-access"

export async function createUserAgent(data: {
  name: string
  icon: string
  description: string | null
  system_prompt: string
  base_model: string
  category: string | null
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const layerAccess = await getUserLayerAccess(user.id)
  if (!layerAccess.allowCustomAgentCrud) {
    return { error: "Custom agent management is not available on your plan" }
  }

  const { data: agent, error } = await supabase
    .from("agents")
    .insert({
      ...data,
      user_id: user.id,
      is_builtin: false,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  revalidatePath("/dashboard/agents")
  return { id: agent.id }
}

export async function updateUserAgent(
  agentId: string,
  data: {
    name: string
    icon: string
    description: string | null
    system_prompt: string
    base_model: string
    category: string | null
  }
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const layerAccess = await getUserLayerAccess(user.id)
  if (!layerAccess.allowCustomAgentCrud) {
    return { error: "Custom agent management is not available on your plan" }
  }

  // Verify ownership — only update if user owns this non-builtin agent
  const { error } = await supabase
    .from("agents")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", agentId)
    .eq("user_id", user.id)
    .eq("is_builtin", false)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/agents")
  revalidatePath(`/dashboard/agents/${agentId}`)
}

export async function deleteUserAgent(
  agentId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const layerAccess = await getUserLayerAccess(user.id)
  if (!layerAccess.allowCustomAgentCrud) {
    return { error: "Custom agent management is not available on your plan" }
  }

  // Verify ownership before deleting
  const { error } = await supabase
    .from("agents")
    .delete()
    .eq("id", agentId)
    .eq("user_id", user.id)
    .eq("is_builtin", false)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/agents")
}
