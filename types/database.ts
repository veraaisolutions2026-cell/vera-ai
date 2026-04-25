import type { Tables } from "./supabase"

type ProfileRole = "admin" | "user" | "viewer"
type MessageRole = "user" | "assistant"

export type Profile = Omit<Tables<"profiles">, "role"> & {
  role: ProfileRole
}

export type Agent = Tables<"agents">
export type KnowledgeBaseFile = Tables<"knowledge_base_files">
export type AgentKnowledgeBaseFile = Tables<"agent_knowledge_base_files">

export type Chat = Tables<"chats">

export type Message = Omit<Tables<"messages">, "role"> & {
  role: MessageRole
}

export type UserData = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  role: ProfileRole
  provider?: string
}
