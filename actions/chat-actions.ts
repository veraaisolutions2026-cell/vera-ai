"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  createChat,
  updateChatTitle,
  deleteChat,
  deleteMultipleChats,
} from "@/lib/db/chats"
import { createMessage } from "@/lib/db/messages"
import {
  buildUserMessageParts,
  extractTextFromMessageParts,
  type ChatAttachment,
} from "@/lib/chat-attachments"
import { getAgent } from "@/lib/db/agents"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { getUsageAvailability } from "@/lib/db/usage-limits"

export async function startChat(
  message: string,
  attachments: ChatAttachment[] = [],
  agentId?: string,
  model?: string
): Promise<{
  chatId?: string
  redirectTo?: string
  error?: string
  remainingRequests?: number | null
  monthlyRequestLimit?: number | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { redirectTo: "/login" }
  const userId = user.id

  const usage = await getUsageAvailability(userId)
  if (!usage.isAvailable) {
    return {
      error: "out_of_usage",
      remainingRequests: usage.remainingRequests,
      monthlyRequestLimit: usage.monthlyRequestLimit,
    }
  }

  const parts = buildUserMessageParts(message, attachments)
  const content = extractTextFromMessageParts(parts)
  if (!content) return { error: "empty_message" }

  let resolvedAgentId: string | undefined

  if (agentId) {
    const [layerAccess, agent] = await Promise.all([
      getUserLayerAccess(userId),
      getAgent(agentId),
    ])

    if (!agent || (!agent.is_builtin && agent.user_id !== userId)) {
      return { error: "invalid_agent" }
    }

    const canUseAgent = agent.is_builtin
      ? layerAccess.allowBuiltInAgents
      : layerAccess.allowCustomAgentCrud

    if (!canUseAgent) {
      return { error: "agent_not_allowed" }
    }

    resolvedAgentId = agent.id
  }

  const chat = await createChat(
    userId,
    model ?? "claude-sonnet-4-6",
    resolvedAgentId
  )

  if (!chat) return { error: "chat_create_failed" }

  // Save the user message server-side BEFORE redirect so the chat page
  // can load it from DB and pass it to useChat as an initial message.
  await createMessage(chat.id, userId, "user", content, { parts })

  revalidatePath("/dashboard", "layout")

  return { chatId: chat.id }
}

export async function renameChat(chatId: string, title: string): Promise<void> {
  const trimmed = title.trim().slice(0, 120)
  if (!trimmed) return
  await updateChatTitle(chatId, trimmed)
  revalidatePath("/dashboard", "layout")
}

export async function removeChatAction(chatId: string): Promise<void> {
  await deleteChat(chatId)
  revalidatePath("/dashboard", "layout")
}

export async function removeMultipleChatsAction(
  chatIds: string[]
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !chatIds.length) return
  await deleteMultipleChats(user.id, chatIds)
  revalidatePath("/dashboard", "layout")
}
