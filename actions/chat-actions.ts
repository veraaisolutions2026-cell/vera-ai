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
import { createServiceClient } from "@/lib/supabase/service"
import {
  buildUserMessageParts,
  extractTextFromMessageParts,
  type ChatAttachment,
} from "@/lib/chat-attachments"
import type { Json } from "@/types/supabase"

const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.VERA_DEV_BYPASS_AUTH === "true"

export async function startChat(
  message: string,
  attachments: ChatAttachment[] = [],
  agentId?: string,
  model?: string
): Promise<{ chatId?: string; redirectTo?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const bypassUserId = process.env.VERA_DEV_BYPASS_USER_ID?.trim()
  const userId = user?.id ?? (DEV_AUTH_BYPASS ? bypassUserId : undefined)

  if (!userId) return { redirectTo: "/login" }

  const parts = buildUserMessageParts(message, attachments)
  const content = extractTextFromMessageParts(parts)
  if (!content) return { error: "empty_message" }

  const chat =
    DEV_AUTH_BYPASS && !user
      ? await createServiceClient()
          .from("chats")
          .insert({
            user_id: userId,
            model: model ?? "claude-sonnet-4-6",
            agent_id: agentId ?? null,
          })
          .select("id")
          .single()
          .then((r) => (r.error ? null : { id: r.data.id }))
      : await createChat(
          userId,
          model ?? "claude-sonnet-4-6",
          agentId || undefined
        )

  if (!chat) return { error: "chat_create_failed" }

  // Save the user message server-side BEFORE redirect so the chat page
  // can load it from DB and pass it to useChat as an initial message.
  if (DEV_AUTH_BYPASS && !user) {
    const payload = {
      chat_id: chat.id,
      user_id: userId,
      role: "user",
      content,
      parts: parts as Json,
    }

    const { error } = await createServiceClient()
      .from("messages")
      .insert(payload)
    if (error) {
      await createServiceClient().from("messages").insert({
        chat_id: chat.id,
        user_id: userId,
        role: "user",
        content,
      })
    }
  } else {
    await createMessage(chat.id, userId, "user", content, { parts })
  }

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

export async function saveTestExchangeAction(
  chatId: string,
  userText: string,
  assistantText: string
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const userContent = userText.trim()
  const assistantContent = assistantText.trim()
  if (!chatId || !userContent || !assistantContent) return

  const { data: chat } = await supabase
    .from("chats")
    .select("id, user_id, title")
    .eq("id", chatId)
    .eq("user_id", user.id)
    .single()

  if (!chat) return

  const { data: recent } = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(2)

  const last = recent ?? []
  if (
    last.length === 2 &&
    last[0]?.role === "assistant" &&
    last[0]?.content === assistantContent &&
    last[1]?.role === "user" &&
    last[1]?.content === userContent
  ) {
    return
  }

  await createMessage(chatId, user.id, "user", userContent)
  await createMessage(chatId, user.id, "assistant", assistantContent)

  if (chat.title === "New chat") {
    const title = userContent.slice(0, 60)
    if (title) {
      await updateChatTitle(chatId, title)
    }
  }

  revalidatePath("/dashboard", "layout")
}
