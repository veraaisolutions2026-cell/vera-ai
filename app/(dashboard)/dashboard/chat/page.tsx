import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAllAgentsForUser } from "@/lib/db/agents"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { isAnswerPreference } from "@/lib/answer-preference"
import { ChatNewPage } from "./components/chat-new-page"

export default async function NewChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [profileResult, layerAccess] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, answer_preference")
      .eq("id", user.id)
      .single(),
    getUserLayerAccess(user.id),
  ])

  const scopedAgents = await getAllAgentsForUser(user.id, layerAccess.layer)

  const filteredAgents = scopedAgents.filter((agent) => {
    if (agent.is_builtin) {
      return layerAccess.allowBuiltInAgents
    }

    return layerAccess.allowCustomAgentCrud
  })

  const userName =
    profileResult.data?.full_name ?? user.email?.split("@")[0] ?? "User"

  return (
    <ChatNewPage
      userName={userName}
      agents={filteredAgents}
      initialAnswerPreference={
        isAnswerPreference(profileResult.data?.answer_preference)
          ? profileResult.data.answer_preference
          : null
      }
    />
  )
}
