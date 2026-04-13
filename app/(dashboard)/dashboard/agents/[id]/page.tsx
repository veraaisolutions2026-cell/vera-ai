import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAgent } from "@/lib/db/agents"
import { AgentEditForm } from "./components/agent-edit-form"

export const metadata = {
  title: "Edit Agent — Vera AI",
}

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const agent = await getAgent(id)

  // Must exist, must belong to user, must not be a built-in
  if (!agent || agent.user_id !== user.id || agent.is_builtin) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AgentEditForm agent={agent} />
    </div>
  )
}
