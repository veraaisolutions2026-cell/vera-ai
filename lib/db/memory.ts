import { createServiceClient } from "@/lib/supabase/service"
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/types/supabase"
import type {
  MemorySettings,
  SavedMemory,
  SavedMemoryRevision,
} from "@/types/database"
import type { MemoryCategory, MemorySource } from "@/lib/memory-contract"

type SavedMemoryRow = Tables<"saved_memories">
type SavedMemoryRevisionInsert = TablesInsert<"saved_memory_revisions">

export type ListSavedMemoriesOptions = {
  includeArchived?: boolean
  includeDeleted?: boolean
  limit?: number
}

export type SearchSavedMemoriesOptions = ListSavedMemoriesOptions

export type CreateSavedMemoryInput = {
  title: string
  content: string
  category?: MemoryCategory
  source?: MemorySource
  priority?: SavedMemoryRow["priority"]
  sourceChatId?: string | null
}

export type UpdateSavedMemoryInput = {
  title?: string
  content?: string
  category?: MemoryCategory
  source?: MemorySource
  priority?: SavedMemoryRow["priority"]
  status?: SavedMemoryRow["status"]
  sourceChatId?: string | null
}

export type UpdateMemorySettingsInput = Partial<MemorySettings>

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function assertMemoryTitle(title: string): string {
  const normalized = normalizeText(title)

  if (normalized.length < 1 || normalized.length > 120) {
    throw new Error("Memory title must be between 1 and 120 characters")
  }

  return normalized
}

function assertMemoryContent(content: string): string {
  const normalized = content.trim()

  if (normalized.length < 1 || normalized.length > 1000) {
    throw new Error("Memory content must be between 1 and 1000 characters")
  }

  return normalized
}

function buildStatusPatch(
  status: SavedMemoryRow["status"]
): Pick<SavedMemoryRow, "status" | "archived_at" | "deleted_at"> {
  const now = new Date().toISOString()

  if (status === "archived") {
    return {
      status,
      archived_at: now,
      deleted_at: null,
    }
  }

  if (status === "deleted") {
    return {
      status,
      archived_at: null,
      deleted_at: now,
    }
  }

  return {
    status,
    archived_at: null,
    deleted_at: null,
  }
}

async function logMemoryRevision(
  revision: SavedMemoryRevisionInsert
): Promise<void> {
  const service = createServiceClient()
  const { error } = await service
    .from("saved_memory_revisions")
    .insert(revision)

  if (error) {
    throw new Error(error.message)
  }
}

async function getOwnedSavedMemory(
  userId: string,
  memoryId: string
): Promise<SavedMemory> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("saved_memories")
    .select("*")
    .eq("id", memoryId)
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    throw new Error("Memory not found")
  }

  return data as SavedMemory
}

export async function getMemorySettings(
  userId: string
): Promise<MemorySettings> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("reference_saved_memories, reference_chat_history")
    .eq("id", userId)
    .single()

  if (error || !data) {
    throw new Error("Unable to load memory settings")
  }

  return {
    reference_saved_memories: data.reference_saved_memories,
    reference_chat_history: data.reference_chat_history,
  }
}

export async function updateMemorySettings(
  userId: string,
  input: UpdateMemorySettingsInput
): Promise<MemorySettings> {
  const patch: UpdateMemorySettingsInput = {}

  if (typeof input.reference_saved_memories === "boolean") {
    patch.reference_saved_memories = input.reference_saved_memories
  }

  if (typeof input.reference_chat_history === "boolean") {
    patch.reference_chat_history = input.reference_chat_history
  }

  if (Object.keys(patch).length === 0) {
    return getMemorySettings(userId)
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("reference_saved_memories, reference_chat_history")
    .single()

  if (error || !data) {
    throw new Error("Unable to update memory settings")
  }

  return {
    reference_saved_memories: data.reference_saved_memories,
    reference_chat_history: data.reference_chat_history,
  }
}

export async function listSavedMemories(
  userId: string,
  options: ListSavedMemoriesOptions = {}
): Promise<SavedMemory[]> {
  const service = createServiceClient()

  let query = service
    .from("saved_memories")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (typeof options.limit === "number") {
    query = query.limit(Math.min(Math.max(options.limit, 1), 500))
  }

  if (!options.includeDeleted) {
    query = query.neq("status", "deleted")
  }

  if (!options.includeArchived) {
    query = query.neq("status", "archived")
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SavedMemory[]
}

export async function searchSavedMemories(
  userId: string,
  queryText: string,
  options: SearchSavedMemoriesOptions = {}
): Promise<SavedMemory[]> {
  const normalizedQuery = normalizeText(queryText)
  if (!normalizedQuery) {
    return listSavedMemories(userId, options)
  }

  const service = createServiceClient()
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const compactPattern = `%${normalizedQuery.replace(/[%_]/g, "")}%`

  let query = service
    .from("saved_memories")
    .select("*")
    .eq("user_id", userId)
    .or(`title.ilike.${compactPattern},content.ilike.${compactPattern}`)
    .order("updated_at", { ascending: false })
    .limit(limit)

  if (!options.includeDeleted) {
    query = query.neq("status", "deleted")
  }

  if (!options.includeArchived) {
    query = query.neq("status", "archived")
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SavedMemory[]
}

export async function createSavedMemory(
  userId: string,
  input: CreateSavedMemoryInput
): Promise<SavedMemory> {
  const service = createServiceClient()

  const row: TablesInsert<"saved_memories"> = {
    user_id: userId,
    title: assertMemoryTitle(input.title),
    content: assertMemoryContent(input.content),
    category: input.category ?? "other",
    source: input.source ?? "explicit-user",
    priority: input.priority ?? "standard",
    source_chat_id: input.sourceChatId ?? null,
    status: "active",
  }

  const { data, error } = await service
    .from("saved_memories")
    .insert(row)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create saved memory")
  }

  await logMemoryRevision({
    memory_id: data.id,
    user_id: userId,
    actor_user_id: userId,
    action: "created",
    previous_value: null,
    next_value: data as unknown as Json,
  })

  return data as SavedMemory
}

export async function updateSavedMemory(
  userId: string,
  memoryId: string,
  input: UpdateSavedMemoryInput
): Promise<SavedMemory> {
  const existing = await getOwnedSavedMemory(userId, memoryId)

  const patch: TablesUpdate<"saved_memories"> = {
    user_id: userId,
    title:
      typeof input.title === "string"
        ? assertMemoryTitle(input.title)
        : existing.title,
    content:
      typeof input.content === "string"
        ? assertMemoryContent(input.content)
        : existing.content,
    category: input.category ?? existing.category,
    source: input.source ?? existing.source,
    priority: input.priority ?? existing.priority,
    source_chat_id:
      input.sourceChatId === undefined
        ? existing.source_chat_id
        : input.sourceChatId,
    ...buildStatusPatch(input.status ?? existing.status),
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from("saved_memories")
    .update(patch)
    .eq("id", memoryId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update saved memory")
  }

  await logMemoryRevision({
    memory_id: data.id,
    user_id: userId,
    actor_user_id: userId,
    action:
      input.status === "deleted"
        ? "deleted"
        : input.status === "archived"
          ? "archived"
          : input.status === "active" && existing.status !== "active"
            ? "restored"
            : "updated",
    previous_value: existing as unknown as Json,
    next_value: data as unknown as Json,
  })

  return data as SavedMemory
}

export async function deleteSavedMemory(
  userId: string,
  memoryId: string
): Promise<SavedMemory> {
  return updateSavedMemory(userId, memoryId, { status: "deleted" })
}

export async function deleteAllSavedMemories(userId: string): Promise<number> {
  const existing = await listSavedMemories(userId, {
    includeArchived: true,
    includeDeleted: false,
  })

  if (existing.length === 0) {
    return 0
  }

  const service = createServiceClient()
  const now = new Date().toISOString()
  const ids = existing.map((memory) => memory.id)

  const { data, error } = await service
    .from("saved_memories")
    .update({
      status: "deleted",
      archived_at: null,
      deleted_at: now,
    })
    .eq("user_id", userId)
    .in("id", ids)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  const revisionRows: SavedMemoryRevisionInsert[] = existing.map((memory) => {
    const nextValue = data?.find((row) => row.id === memory.id) ?? null

    return {
      memory_id: memory.id,
      user_id: userId,
      actor_user_id: userId,
      action: "deleted",
      previous_value: memory as unknown as Json,
      next_value: nextValue as unknown as Json,
    }
  })

  if (revisionRows.length > 0) {
    const { error: revisionError } = await service
      .from("saved_memory_revisions")
      .insert(revisionRows)

    if (revisionError) {
      throw new Error(revisionError.message)
    }
  }

  return existing.length
}

export async function listSavedMemoryRevisions(
  userId: string,
  limit = 100
): Promise<SavedMemoryRevision[]> {
  const service = createServiceClient()
  const resolvedLimit = Math.min(Math.max(limit, 1), 500)
  const { data, error } = await service
    .from("saved_memory_revisions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(resolvedLimit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as SavedMemoryRevision[]
}

export async function markSavedMemoryReferenced(
  userId: string,
  memoryIds: string[]
): Promise<void> {
  const resolvedIds = Array.from(
    new Set(
      memoryIds.filter((memoryId) => typeof memoryId === "string" && memoryId)
    )
  )

  if (resolvedIds.length === 0) {
    return
  }

  const service = createServiceClient()
  const { error } = await service
    .from("saved_memories")
    .update({ last_referenced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", resolvedIds)

  if (error) {
    throw new Error(error.message)
  }
}
