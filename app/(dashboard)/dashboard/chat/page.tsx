import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAllAgentsForUser } from "@/lib/db/agents"
import { ChatNewPage } from "./components/chat-new-page"

export default async function NewChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [agents, profileResult] = await Promise.all([
    getAllAgentsForUser(user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ])

  const userName =
    profileResult.data?.full_name ?? user.email?.split("@")[0] ?? "User"

  return <ChatNewPage userName={userName} agents={agents} />
}
