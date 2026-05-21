import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRecentChats } from "@/lib/db/chats"
import { ChatManager } from "./components/chat-manager"

export const metadata = {
  title: "Manage Chats - Vera AI",
}

export default async function ManageChatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const chats = await getRecentChats(user.id, 200)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Manage Chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {chats.length} conversation{chats.length !== 1 ? "s" : ""} - select
          one or more to delete.
        </p>
      </div>
      <ChatManager chats={chats} />
    </div>
  )
}
