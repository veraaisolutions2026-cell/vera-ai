import type { Tables } from "./supabase"

type ProfileRole = "admin" | "user" | "viewer"
type MessageRole = "user" | "assistant"

export type Profile = Omit<Tables<"profiles">, "role"> & {
  role: ProfileRole
}

export type Agent = Tables<"agents">
export type KnowledgeBaseFile = Tables<"knowledge_base_files">
export type AgentKnowledgeBaseFile = Tables<"agent_knowledge_base_files">
export type SavedMemory = Tables<"saved_memories">
export type SavedMemoryRevision = Tables<"saved_memory_revisions">

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

export type MemorySettings = Pick<
  Tables<"profiles">,
  "reference_saved_memories" | "reference_chat_history"
>
