import {
  getMemorySettings,
  listSavedMemories,
  markSavedMemoryReferenced,
  searchSavedMemories,
} from "@/lib/db/memory"
import { MEMORY_TOOL_GUIDANCE } from "@/lib/memory-contract"
import { createServiceClient } from "@/lib/supabase/service"
import type { MemorySettings, SavedMemory } from "@/types/database"

const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  reference_saved_memories: true,
  reference_chat_history: true,
}

type ChatHistoryRecallItem = {
  chatId: string
  createdAt: string
  userContent: string
  assistantContent: string
}

export type ChatMemoryPromptContext = {
  settings: MemorySettings
  savedMemories: SavedMemory[]
  chatHistoryRecall: ChatHistoryRecallItem[]
  systemPrompt: string
}

type BuildChatMemoryPromptContextOptions = {
  userId: string
  chatId: string
  latestUserText: string
  isTemporaryChat?: boolean
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function sanitizeSearchText(value: string): string {
  return normalizeWhitespace(value.replace(/[%,_]/g, " ")).slice(0, 160)
}

function truncateText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value)
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

function dedupeSavedMemories(memories: SavedMemory[]): SavedMemory[] {
  const seen = new Set<string>()
  const deduped: SavedMemory[] = []

  for (const memory of memories) {
    if (seen.has(memory.id)) {
      continue
    }

    seen.add(memory.id)
    deduped.push(memory)
  }

  return deduped
}

async function getRelevantSavedMemories(
  userId: string,
  latestUserText: string
): Promise<SavedMemory[]> {
  const searchText = sanitizeSearchText(latestUserText)
  const [recentMemories, matchedMemories] = await Promise.all([
    listSavedMemories(userId, { limit: 6 }),
    searchText
      ? searchSavedMemories(userId, searchText, { limit: 6 })
      : Promise.resolve([]),
  ])

  return dedupeSavedMemories([...matchedMemories, ...recentMemories]).slice(
    0,
    6
  )
}

async function getRelevantChatHistoryRecall(
  userId: string,
  chatId: string,
  latestUserText: string
): Promise<ChatHistoryRecallItem[]> {
  const searchText = sanitizeSearchText(latestUserText)
  if (!searchText) {
    return []
  }

  const service = createServiceClient()
  const ilikePattern = `%${searchText}%`
  const { data, error } = await service
    .from("chat_turn_pairs")
    .select("chat_id, created_at, user_content, assistant_content")
    .eq("user_id", userId)
    .neq("chat_id", chatId)
    .or(
      `user_content.ilike.${ilikePattern},assistant_content.ilike.${ilikePattern}`
    )
    .order("created_at", { ascending: false })
    .limit(4)

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    chatId: row.chat_id,
    createdAt: row.created_at,
    userContent: truncateText(row.user_content, 180),
    assistantContent: truncateText(row.assistant_content, 220),
  }))
}

function formatSavedMemorySection(memories: SavedMemory[]): string {
  if (memories.length === 0) {
    return "Relevant saved memories: none found."
  }

  const lines = memories.map((memory, index) => {
    return `${index + 1}. [${memory.category} | ${memory.priority}] ${memory.title}: ${truncateText(memory.content, 220)}`
  })

  return `Relevant saved memories:\n${lines.join("\n")}`
}

function formatChatHistoryRecallSection(
  items: ChatHistoryRecallItem[]
): string {
  if (items.length === 0) {
    return "Relevant recall from prior chats: none found."
  }

  const lines = items.map((item, index) => {
    return `${index + 1}. Prior turn on ${item.createdAt}: user said \"${item.userContent}\"; Vera replied \"${item.assistantContent}\".`
  })

  return `Relevant recall from prior chats:\n${lines.join("\n")}`
}

export async function buildChatMemoryPromptContext(
  options: BuildChatMemoryPromptContextOptions
): Promise<ChatMemoryPromptContext> {
  if (options.isTemporaryChat) {
    const sections = [
      "MEMORY RUNTIME",
      "Temporary chat: enabled.",
      "Saved memory reference: disabled for this conversation.",
      "Chat history reference: disabled for this conversation.",
      "Relevant saved memories: unavailable in Temporary Chat.",
      "Relevant recall from prior chats: unavailable in Temporary Chat.",
      "Memory management policy: Temporary Chat is isolated. Do not rely on saved memory or prior-chat recall in this conversation, and explain that memory questions or forget requests must be handled in a standard chat or on the Memory page.",
    ]

    return {
      settings: {
        reference_saved_memories: false,
        reference_chat_history: false,
      },
      savedMemories: [],
      chatHistoryRecall: [],
      systemPrompt: `\n\n${sections.join("\n\n")}`,
    }
  }

  let settings = DEFAULT_MEMORY_SETTINGS

  try {
    settings = await getMemorySettings(options.userId)
  } catch {
    settings = DEFAULT_MEMORY_SETTINGS
  }

  const [savedMemories, chatHistoryRecall] = await Promise.all([
    settings.reference_saved_memories
      ? getRelevantSavedMemories(options.userId, options.latestUserText).catch(
          () => []
        )
      : Promise.resolve([]),
    settings.reference_chat_history
      ? getRelevantChatHistoryRecall(
          options.userId,
          options.chatId,
          options.latestUserText
        ).catch(() => [])
      : Promise.resolve([]),
  ])

  if (savedMemories.length > 0) {
    await markSavedMemoryReferenced(
      options.userId,
      savedMemories.map((memory) => memory.id)
    ).catch(() => undefined)
  }

  const sections = [
    "MEMORY RUNTIME",
    `Saved memory reference: ${settings.reference_saved_memories ? "enabled" : "disabled"}.`,
    `Chat history reference: ${settings.reference_chat_history ? "enabled" : "disabled"}.`,
    formatSavedMemorySection(savedMemories),
    formatChatHistoryRecallSection(chatHistoryRecall),
    `Memory management policy: ${MEMORY_TOOL_GUIDANCE} After any memory tool call, continue with a normal assistant answer for the user. Do not end the turn with only a tool call.`,
  ]

  return {
    settings,
    savedMemories,
    chatHistoryRecall,
    systemPrompt: `\n\n${sections.join("\n\n")}`,
  }
}
