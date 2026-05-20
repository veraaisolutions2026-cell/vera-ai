"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  createSavedMemory,
  deleteAllSavedMemories,
  deleteSavedMemory,
  updateMemorySettings,
  updateSavedMemory,
} from "@/lib/db/memory"
import {
  memoryCategorySchema,
  memoryPrioritySchema,
} from "@/lib/memory-contract"
import { createClient } from "@/lib/supabase/server"

const memorySettingsInputSchema = z.object({
  reference_saved_memories: z.boolean(),
  reference_chat_history: z.boolean(),
})

const createMemoryInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  content: z.string().trim().min(1, "Memory text is required").max(1000),
  category: memoryCategorySchema.default("other"),
  priority: memoryPrioritySchema.default("standard"),
})

const updateMemoryInputSchema = createMemoryInputSchema.extend({
  memoryId: z.string().min(1, "Memory ID is required"),
})

const deleteMemoryInputSchema = z.object({
  memoryId: z.string().min(1, "Memory ID is required"),
})

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

function revalidateMemorySurfaces(): void {
  revalidatePath("/dashboard/memory")
  revalidatePath("/dashboard/chat")
}

export async function updateMemorySettingsAction(input: unknown) {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false as const, error: "Unauthorized" }
  }

  const parsed = memorySettingsInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid settings",
    }
  }

  try {
    const settings = await updateMemorySettings(userId, {
      reference_saved_memories: parsed.data.reference_saved_memories,
      reference_chat_history: parsed.data.reference_chat_history,
    })

    revalidateMemorySurfaces()

    return {
      success: true as const,
      settings,
    }
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to update settings",
    }
  }
}

export async function createSavedMemoryAction(input: unknown) {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false as const, error: "Unauthorized" }
  }

  const parsed = createMemoryInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid memory",
    }
  }

  try {
    const memory = await createSavedMemory(userId, {
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      priority: parsed.data.priority,
      source: "manual-panel",
    })

    revalidateMemorySurfaces()

    return {
      success: true as const,
      memory,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create memory",
    }
  }
}

export async function updateSavedMemoryAction(input: unknown) {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false as const, error: "Unauthorized" }
  }

  const parsed = updateMemoryInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid memory",
    }
  }

  try {
    const memory = await updateSavedMemory(userId, parsed.data.memoryId, {
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      priority: parsed.data.priority,
      source: "manual-panel",
    })

    revalidateMemorySurfaces()

    return {
      success: true as const,
      memory,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update memory",
    }
  }
}

export async function deleteSavedMemoryAction(input: unknown) {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false as const, error: "Unauthorized" }
  }

  const parsed = deleteMemoryInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid memory",
    }
  }

  try {
    const memory = await deleteSavedMemory(userId, parsed.data.memoryId)

    revalidateMemorySurfaces()

    return {
      success: true as const,
      memory,
    }
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete memory",
    }
  }
}

export async function deleteAllSavedMemoriesAction() {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false as const, error: "Unauthorized" }
  }

  try {
    const deletedCount = await deleteAllSavedMemories(userId)

    revalidateMemorySurfaces()

    return {
      success: true as const,
      deletedCount,
    }
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete all memories",
    }
  }
}
