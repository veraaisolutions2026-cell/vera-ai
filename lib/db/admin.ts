import { createClient } from "@/lib/supabase/server"
import type { Agent, Profile } from "@/types/database"

export type UserRow = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "role" | "created_at"
> & { email: string | null }

export type AdminStats = {
  totalUsers: number
  totalAgents: number
  totalChats: number
}

export async function getAllUsers(): Promise<UserRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, created_at")
    .order("created_at", { ascending: false })

  if (error || !data) return []

  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const emailMap: Record<string, string> = {}
  authUsers?.users?.forEach((u) => {
    emailMap[u.id] = u.email ?? ""
  })

  return data.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    role: p.role as Profile["role"],
    created_at: p.created_at,
    email: emailMap[p.id] ?? null,
  }))
}

export async function getAllAgents(): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("is_builtin", { ascending: false })
    .order("name")

  if (error || !data) return []
  return data as Agent[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient()

  const [usersResult, agentsResult, chatsResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("agents").select("id", { count: "exact", head: true }),
    supabase.from("chats").select("id", { count: "exact", head: true }),
  ])

  return {
    totalUsers: usersResult.count ?? 0,
    totalAgents: agentsResult.count ?? 0,
    totalChats: chatsResult.count ?? 0,
  }
}

export async function adminCreateAgent(
  agent: Omit<Agent, "id" | "created_at" | "updated_at">
): Promise<Agent | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .insert(agent)
    .select()
    .single()

  if (error) return null
  return data as Agent
}

export async function adminUpdateAgent(
  id: string,
  updates: Partial<Omit<Agent, "id" | "created_at" | "updated_at">>
): Promise<Agent | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("agents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return null
  return data as Agent
}

export async function adminDeleteAgent(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from("agents").delete().eq("id", id)
  return !error
}

export async function adminUpdateUserRole(
  userId: string,
  role: Profile["role"]
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
  return !error
}
