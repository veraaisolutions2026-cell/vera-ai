import { notFound, redirect } from "next/navigation"
import type { UIMessage } from "ai"
import { createClient } from "@/lib/supabase/server"
import { getAllAgentsForUser } from "@/lib/db/agents"
import { parseStoredMessageParts } from "@/lib/chat-attachments"
import { getChat } from "@/lib/db/chats"
import { getMessages } from "@/lib/db/messages"
import { ChatSession } from "../components/chat-session"

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const chat = await getChat(id)

  if (!chat || chat.user_id !== user.id) {
    notFound()
  }

  const [messages, agents, profileResult] = await Promise.all([
    getMessages(chat.id, user.id),
    getAllAgentsForUser(user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ])

  const userName =
    profileResult.data?.full_name ?? user.email?.split("@")[0] ?? "User"

  const allMessages: UIMessage[] = messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: (parseStoredMessageParts(message.parts) ?? [
      { type: "text", text: message.content },
    ]) as UIMessage["parts"],
  }))

  // If the chat has only a single user message and no assistant reply yet,
  // this is a brand-new session from the welcome screen. Pass the message
  // text as a separate prop so ChatSession can send it with sendMessage({ text })
  // (which gives the AI SDK a fresh random ID, triggers the welcome→chat
  // transition animation, and avoids every timing race that sendMessage(null)
  // creates for slow reasoning models).
  const isBrandNewChat =
    allMessages.length === 1 && allMessages[0]?.role === "user"
  const hasPendingAttachmentParts = Boolean(
    isBrandNewChat && allMessages[0]?.parts.some((part) => part.type === "file")
  )

  const pendingFirstMessage = isBrandNewChat
    ? ((
        allMessages[0]!.parts.find((p) => p.type === "text") as
          | { type: "text"; text: string }
          | undefined
      )?.text ?? "")
    : undefined

  const initialMessages =
    isBrandNewChat && !hasPendingAttachmentParts ? [] : allMessages

  const activeAgent = chat.agent_id
    ? (agents.find((agent) => agent.id === chat.agent_id) ?? null)
    : null

  return (
    <ChatSession
      chatId={chat.id}
      initialTitle={chat.title}
      userName={userName}
      agents={agents}
      lockedModel={chat.model}
      initialMessages={initialMessages}
      pendingFirstMessage={
        hasPendingAttachmentParts ? undefined : pendingFirstMessage
      }
      selectedAgent={activeAgent}
    />
  )
}
