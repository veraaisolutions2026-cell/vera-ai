import { z } from "zod"

export const MEMORY_ROUTE_MAP = {
  dashboard: "/dashboard/memory",
  temporaryChatEntry: "/dashboard/chat?temporary=1",
} as const

export const memoryCategorySchema = z.enum([
  "identity",
  "preference",
  "communication-style",
  "work-context",
  "project-context",
  "agent-preference",
  "constraint",
  "other",
])

export const memorySourceSchema = z.enum([
  "explicit-user",
  "assistant-inferred",
  "manual-panel",
])

export const memoryPrioritySchema = z.enum(["core", "standard", "background"])

export const memoryStatusSchema = z.enum(["active", "archived", "deleted"])

export const memorySettingsSchema = z.object({
  referenceSavedMemories: z.boolean().default(true),
  referenceChatHistory: z.boolean().default(true),
})

export const temporaryChatStateSchema = z.object({
  isTemporaryChat: z.boolean().default(false),
})

export const memoryCommandSchema = z.enum([
  "remember",
  "update",
  "forget",
  "list",
  "search",
  "delete-all",
])

const memoryIdSchema = z.string().min(1)

const savedMemorySearchOptionsSchema = z.object({
  includeArchived: z.boolean().optional(),
  includeDeleted: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional(),
})

export const savedMemorySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(1000),
  category: memoryCategorySchema,
  source: memorySourceSchema,
  priority: memoryPrioritySchema.default("standard"),
  status: memoryStatusSchema.default("active"),
  sourceChatId: z.string().min(1).nullable().optional(),
  archivedAt: z.string().min(1).nullable().optional(),
  deletedAt: z.string().min(1).nullable().optional(),
  lastReferencedAt: z.string().min(1).nullable().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const rememberMemoryInputSchema = z.object({
  command: z.literal("remember"),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(1000),
  category: memoryCategorySchema.optional(),
  source: memorySourceSchema.optional(),
  priority: memoryPrioritySchema.optional(),
  sourceChatId: z.string().min(1).nullable().optional(),
})

export const updateMemoryInputSchema = z
  .object({
    command: z.literal("update"),
    memoryId: memoryIdSchema,
    title: z.string().min(1).max(120).optional(),
    content: z.string().min(1).max(1000).optional(),
    category: memoryCategorySchema.optional(),
    source: memorySourceSchema.optional(),
    priority: memoryPrioritySchema.optional(),
    status: memoryStatusSchema.optional(),
    sourceChatId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (input) =>
      input.title !== undefined ||
      input.content !== undefined ||
      input.category !== undefined ||
      input.source !== undefined ||
      input.priority !== undefined ||
      input.status !== undefined ||
      input.sourceChatId !== undefined,
    {
      message: "Update commands must change at least one memory field.",
      path: ["memoryId"],
    }
  )

export const forgetMemoryInputSchema = z
  .object({
    command: z.literal("forget"),
    memoryId: memoryIdSchema.optional(),
    query: z.string().min(1).max(200).optional(),
  })
  .refine(
    (input) => input.memoryId !== undefined || input.query !== undefined,
    {
      message: "Forget commands require a memoryId or a query.",
      path: ["memoryId"],
    }
  )

export const listMemoriesInputSchema = z.object({
  command: z.literal("list"),
  ...savedMemorySearchOptionsSchema.shape,
})

export const searchMemoriesInputSchema = z.object({
  command: z.literal("search"),
  query: z.string().min(1).max(200),
  ...savedMemorySearchOptionsSchema.shape,
})

export const deleteAllMemoriesInputSchema = z.object({
  command: z.literal("delete-all"),
})

export const manageMemoryInputSchema = z
  .object({
    command: memoryCommandSchema,
    memoryId: memoryIdSchema.optional(),
    query: z.string().min(1).max(200).optional(),
    title: z.string().min(1).max(120).optional(),
    content: z.string().min(1).max(1000).optional(),
    category: memoryCategorySchema.optional(),
    source: memorySourceSchema.optional(),
    priority: memoryPrioritySchema.optional(),
    status: memoryStatusSchema.optional(),
    sourceChatId: z.string().min(1).nullable().optional(),
    includeArchived: z.boolean().optional(),
    includeDeleted: z.boolean().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  })
  .superRefine((input, context) => {
    const result = (() => {
      switch (input.command) {
        case "remember":
          return rememberMemoryInputSchema.safeParse(input)
        case "update":
          return updateMemoryInputSchema.safeParse(input)
        case "forget":
          return forgetMemoryInputSchema.safeParse(input)
        case "list":
          return listMemoriesInputSchema.safeParse(input)
        case "search":
          return searchMemoriesInputSchema.safeParse(input)
        case "delete-all":
          return deleteAllMemoriesInputSchema.safeParse(input)
      }
    })()

    if (result.success) {
      return
    }

    for (const issue of result.error.issues) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: issue.path,
        message: issue.message,
      })
    }
  })

export const memoryCommandSuccessSchema = z.object({
  ok: z.literal(true),
  command: memoryCommandSchema,
  summary: z.string().min(1),
  memory: savedMemorySchema.optional(),
  memories: z.array(savedMemorySchema).default([]),
  matchedCount: z.number().int().min(0).optional(),
  deletedCount: z.number().int().min(0).optional(),
})

export const memoryCommandErrorSchema = z.object({
  ok: z.literal(false),
  command: memoryCommandSchema,
  error: z.string().min(1),
})

export const memoryCommandResultSchema = z.union([
  memoryCommandSuccessSchema,
  memoryCommandErrorSchema,
])

export type MemoryCategory = z.infer<typeof memoryCategorySchema>
export type MemorySource = z.infer<typeof memorySourceSchema>
export type MemorySettings = z.infer<typeof memorySettingsSchema>
export type MemoryCommand = z.infer<typeof memoryCommandSchema>
export type SavedMemory = z.infer<typeof savedMemorySchema>
export type ManageMemoryInput = z.infer<typeof manageMemoryInputSchema>
export type MemoryCommandResult = z.infer<typeof memoryCommandResultSchema>

export const MEMORY_V1_BEHAVIOR = {
  sharedScope:
    "Memory is shared per user account across all Vera chats, including chats with agents.",
  storageModel:
    "Saved memory and memory settings live in structured Supabase-backed records, while chat-history recall is derived from existing chats and messages.",
  savedMemory:
    "Saved memory is durable until the user edits or deletes it, and should hold stable preferences, work context, and long-lived constraints.",
  chatHistory:
    "Reference chat history is dynamic recall from prior conversations and should help with personalization without becoming a permanent memory by default.",
  temporaryChat:
    "Temporary chats must bypass saved memory and chat-history recall, and they must not create new memory signals.",
} as const

export const MEMORY_V1_REMEMBER = [
  "Stable working preferences, such as preferred response style or recurring formatting needs.",
  "Durable professional context, such as role, audit focus areas, or repeat project patterns.",
  "Agent usage preferences that should carry across future chats for the same user.",
  "Long-lived constraints the user expects Vera to keep applying without repeated reminders.",
] as const

export const MEMORY_V1_DO_NOT_REMEMBER = [
  "Secrets, credentials, or other sensitive personal data.",
  "Large verbatim templates or full document bodies.",
  "One-off corrections that only matter to a single reply.",
  "Temporary-chat content or ephemeral experimentation that should not personalize later chats.",
] as const

export const MEMORY_V1_MANAGEMENT_ACTIONS = [
  "View and search saved memories from one place.",
  "Edit or delete individual memories.",
  "Clear all saved memories without deleting chat history.",
  "Control saved-memory and chat-history reference separately.",
] as const

export const MEMORY_TOOL_NAME = "manage_memory"

export const MEMORY_TOOL_DESCRIPTION =
  "Manage durable saved memory for the current user. Use this tool to remember long-lived preferences or context, update or forget an existing memory, list saved memories, search for a relevant memory, or delete all saved memories when the user explicitly asks. Do not use it for secrets, one-off requests, or temporary-chat content."

export const MEMORY_TOOL_GUIDANCE = `Use the ${MEMORY_TOOL_NAME} tool only for durable user memory. Prefer remember for long-lived preferences or repeat context, use search or list before update or forget when the target memory is unclear, call list when the user asks what you remember about them, call search when the user asks whether a specific preference is saved, call forget or delete-all when the user explicitly asks to remove saved memory, and never store secrets or temporary-chat content.`
