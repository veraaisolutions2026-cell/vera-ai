import { createClient } from "@/lib/supabase/server"
import type { Agent } from "@/types/database"

export async function getBuiltinAgents(): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("is_builtin", true)
    .order("name")

  if (error) return []
  return (data as Agent[]) ?? []
}

export async function getUserAgents(userId: string): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .eq("is_builtin", false)
    .order("created_at", { ascending: false })

  if (error) return []
  return (data as Agent[]) ?? []
}

export async function getAllAgentsForUser(userId: string): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .or(`is_builtin.eq.true,user_id.eq.${userId}`)
    .order("is_builtin", { ascending: false })
    .order("name")

  if (error) return []
  return (data as Agent[]) ?? []
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single()

  if (error) return null
  return data as Agent
}
