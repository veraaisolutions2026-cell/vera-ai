import type { ToolSet } from "ai"
import {
  createSavedMemory,
  deleteAllSavedMemories,
  deleteSavedMemory,
  getMemorySettings,
  listSavedMemories,
  markSavedMemoryReferenced,
  searchSavedMemories,
  updateSavedMemory,
  type CreateSavedMemoryInput,
  type ListSavedMemoriesOptions,
  type SearchSavedMemoriesOptions,
  type UpdateSavedMemoryInput,
} from "@/lib/db/memory"
import {
  MEMORY_TOOL_DESCRIPTION,
  MEMORY_TOOL_GUIDANCE,
  MEMORY_TOOL_NAME,
  deleteAllMemoriesInputSchema,
  forgetMemoryInputSchema,
  listMemoriesInputSchema,
  manageMemoryInputSchema,
  memoryCommandErrorSchema,
  memoryCommandResultSchema,
  rememberMemoryInputSchema,
  savedMemorySchema,
  searchMemoriesInputSchema,
  updateMemoryInputSchema,
  type ManageMemoryInput,
  type MemoryCommandResult,
  type SavedMemory,
} from "@/lib/memory-contract"
import type {
  MemorySettings as DbMemorySettings,
  SavedMemory as DbSavedMemory,
} from "@/types/database"

export type MemoryStore = {
  createSavedMemory: (
    userId: string,
    input: CreateSavedMemoryInput
  ) => Promise<DbSavedMemory>
  deleteAllSavedMemories: (userId: string) => Promise<number>
  deleteSavedMemory: (
    userId: string,
    memoryId: string
  ) => Promise<DbSavedMemory>
  getMemorySettings: (userId: string) => Promise<DbMemorySettings>
  listSavedMemories: (
    userId: string,
    options?: ListSavedMemoriesOptions
  ) => Promise<DbSavedMemory[]>
  markSavedMemoryReferenced: (
    userId: string,
    memoryIds: string[]
  ) => Promise<void>
  searchSavedMemories: (
    userId: string,
    queryText: string,
    options?: SearchSavedMemoriesOptions
  ) => Promise<DbSavedMemory[]>
  updateSavedMemory: (
    userId: string,
    memoryId: string,
    input: UpdateSavedMemoryInput
  ) => Promise<DbSavedMemory>
}

export type CreateMemoryServiceOptions = {
  userId: string
  isTemporaryChat?: boolean
  sourceChatId?: string | null
  store?: MemoryStore
}

const defaultMemoryStore: MemoryStore = {
  createSavedMemory,
  deleteAllSavedMemories,
  deleteSavedMemory,
  getMemorySettings,
  listSavedMemories,
  markSavedMemoryReferenced,
  searchSavedMemories,
  updateSavedMemory,
}

function toContractSavedMemory(memory: DbSavedMemory): SavedMemory {
  return savedMemorySchema.parse({
    id: memory.id,
    userId: memory.user_id,
    title: memory.title,
    content: memory.content,
    category: memory.category,
    source: memory.source,
    priority: memory.priority,
    status: memory.status,
    sourceChatId: memory.source_chat_id,
    archivedAt: memory.archived_at,
    deletedAt: memory.deleted_at,
    lastReferencedAt: memory.last_referenced_at,
    createdAt: memory.created_at,
    updatedAt: memory.updated_at,
  })
}

function createTemporaryChatResult(
  input: ManageMemoryInput
): MemoryCommandResult {
  return memoryCommandErrorSchema.parse({
    ok: false,
    command: input.command,
    error:
      "Temporary Chat does not read or modify saved memory. Ask the user to use a normal chat or the Memory page instead.",
  })
}

async function attachReferenceTimestamps(
  store: MemoryStore,
  userId: string,
  memories: DbSavedMemory[]
): Promise<void> {
  const memoryIds = memories.map((memory) => memory.id)
  if (memoryIds.length === 0) {
    return
  }

  await store.markSavedMemoryReferenced(userId, memoryIds)
}

export function createMemoryService(options: CreateMemoryServiceOptions) {
  const store = options.store ?? defaultMemoryStore

  async function execute(
    input: ManageMemoryInput
  ): Promise<MemoryCommandResult> {
    const parsedInput = manageMemoryInputSchema.parse(input)

    if (options.isTemporaryChat) {
      return createTemporaryChatResult(parsedInput)
    }

    switch (parsedInput.command) {
      case "remember": {
        const commandInput = rememberMemoryInputSchema.parse(parsedInput)
        const memory = await store.createSavedMemory(options.userId, {
          title: commandInput.title,
          content: commandInput.content,
          category: commandInput.category,
          source: commandInput.source,
          priority: commandInput.priority,
          sourceChatId:
            commandInput.sourceChatId === undefined
              ? (options.sourceChatId ?? null)
              : commandInput.sourceChatId,
        })

        return memoryCommandResultSchema.parse({
          ok: true,
          command: commandInput.command,
          summary: `Saved memory: ${memory.title}`,
          memory: toContractSavedMemory(memory),
          memories: [],
          matchedCount: 1,
        })
      }

      case "update": {
        const commandInput = updateMemoryInputSchema.parse(parsedInput)
        const memory = await store.updateSavedMemory(
          options.userId,
          commandInput.memoryId,
          {
            title: commandInput.title,
            content: commandInput.content,
            category: commandInput.category,
            source: commandInput.source,
            priority: commandInput.priority,
            status: commandInput.status,
            sourceChatId:
              commandInput.sourceChatId === undefined
                ? undefined
                : commandInput.sourceChatId,
          }
        )

        return memoryCommandResultSchema.parse({
          ok: true,
          command: commandInput.command,
          summary: `Updated memory: ${memory.title}`,
          memory: toContractSavedMemory(memory),
          memories: [],
          matchedCount: 1,
        })
      }

      case "forget": {
        const commandInput = forgetMemoryInputSchema.parse(parsedInput)

        if (commandInput.memoryId) {
          const memory = await store.deleteSavedMemory(
            options.userId,
            commandInput.memoryId
          )

          return memoryCommandResultSchema.parse({
            ok: true,
            command: commandInput.command,
            summary: `Forgot memory: ${memory.title}`,
            memory: toContractSavedMemory(memory),
            memories: [],
            deletedCount: 1,
            matchedCount: 1,
          })
        }

        const forgetQuery = commandInput.query
        if (!forgetQuery) {
          return memoryCommandErrorSchema.parse({
            ok: false,
            command: commandInput.command,
            error: "Forget commands require a memoryId or a query.",
          })
        }

        const matches = await store.searchSavedMemories(
          options.userId,
          forgetQuery,
          {
            includeArchived: true,
            includeDeleted: false,
            limit: 10,
          }
        )

        if (matches.length === 0) {
          return memoryCommandResultSchema.parse({
            ok: true,
            command: commandInput.command,
            summary: `No saved memory matched \"${forgetQuery}\".`,
            memories: [],
            matchedCount: 0,
            deletedCount: 0,
          })
        }

        if (matches.length > 1) {
          return memoryCommandResultSchema.parse({
            ok: true,
            command: commandInput.command,
            summary:
              "Multiple saved memories matched. Ask the user which one to forget, or retry with memoryId.",
            memories: matches.map(toContractSavedMemory),
            matchedCount: matches.length,
            deletedCount: 0,
          })
        }

        const memory = await store.deleteSavedMemory(
          options.userId,
          matches[0].id
        )

        return memoryCommandResultSchema.parse({
          ok: true,
          command: commandInput.command,
          summary: `Forgot memory: ${memory.title}`,
          memory: toContractSavedMemory(memory),
          memories: [],
          matchedCount: 1,
          deletedCount: 1,
        })
      }

      case "list": {
        const commandInput = listMemoriesInputSchema.parse(parsedInput)
        const memories = await store.listSavedMemories(options.userId, {
          includeArchived: commandInput.includeArchived,
          includeDeleted: commandInput.includeDeleted,
          limit: commandInput.limit ?? 25,
        })

        await attachReferenceTimestamps(store, options.userId, memories)

        return memoryCommandResultSchema.parse({
          ok: true,
          command: commandInput.command,
          summary:
            memories.length > 0
              ? `Found ${memories.length} saved memor${memories.length === 1 ? "y" : "ies"}.`
              : "No saved memories found.",
          memories: memories.map(toContractSavedMemory),
          matchedCount: memories.length,
        })
      }

      case "search": {
        const commandInput = searchMemoriesInputSchema.parse(parsedInput)
        const memories = await store.searchSavedMemories(
          options.userId,
          commandInput.query,
          {
            includeArchived: commandInput.includeArchived,
            includeDeleted: commandInput.includeDeleted,
            limit: commandInput.limit ?? 10,
          }
        )

        await attachReferenceTimestamps(store, options.userId, memories)

        return memoryCommandResultSchema.parse({
          ok: true,
          command: commandInput.command,
          summary:
            memories.length > 0
              ? `Found ${memories.length} saved memor${memories.length === 1 ? "y" : "ies"} for \"${commandInput.query}\".`
              : `No saved memories matched \"${commandInput.query}\".`,
          memories: memories.map(toContractSavedMemory),
          matchedCount: memories.length,
        })
      }

      case "delete-all": {
        const commandInput = deleteAllMemoriesInputSchema.parse(parsedInput)
        const deletedCount = await store.deleteAllSavedMemories(options.userId)

        return memoryCommandResultSchema.parse({
          ok: true,
          command: commandInput.command,
          summary:
            deletedCount > 0
              ? `Deleted ${deletedCount} saved memor${deletedCount === 1 ? "y" : "ies"}.`
              : "No saved memories needed deletion.",
          memories: [],
          deletedCount,
          matchedCount: deletedCount,
        })
      }
    }
  }

  async function getSettings(): Promise<DbMemorySettings> {
    return store.getMemorySettings(options.userId)
  }

  return {
    execute,
    getSettings,
    toolName: MEMORY_TOOL_NAME,
    toolDescription: MEMORY_TOOL_DESCRIPTION,
    toolGuidance: MEMORY_TOOL_GUIDANCE,
  }
}

export function createMemoryToolSet(
  options: CreateMemoryServiceOptions
): ToolSet {
  const service = createMemoryService(options)

  return {
    [MEMORY_TOOL_NAME]: {
      description: MEMORY_TOOL_DESCRIPTION,
      inputSchema: manageMemoryInputSchema,
      execute: async (input) => service.execute(input),
    },
  } satisfies ToolSet
}
