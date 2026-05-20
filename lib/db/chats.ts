import { createClient } from "@/lib/supabase/server"
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/models"
import type { Chat } from "@/types/database"

export async function getRecentChats(
  userId: string,
  limit = 30
): Promise<Chat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (error) return []
  return (data as Chat[]) ?? []
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single()

  if (error) return null
  return data as Chat
}

export async function createChat(
  userId: string,
  model = DEFAULT_CHAT_MODEL_ID,
  agentId?: string
): Promise<Chat | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, model, agent_id: agentId ?? null })
    .select()
    .single()

  if (error) return null
  return data as Chat
}

export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("chats")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", chatId)
}

export async function deleteChat(chatId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from("chats").delete().eq("id", chatId)
}

export async function deleteMultipleChats(
  userId: string,
  chatIds: string[]
): Promise<void> {
  if (!chatIds.length) return
  const supabase = await createClient()
  await supabase.from("chats").delete().eq("user_id", userId).in("id", chatIds)
}
