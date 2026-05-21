import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { AgentBuilder } from "./components/agent-builder"

export const metadata = {
  title: "Create Agent - Vera AI",
}

export default async function NewAgentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const layerAccess = await getUserLayerAccess(user.id)

  if (!layerAccess.allowCustomAgentCrud) {
    redirect("/dashboard/agents")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AgentBuilder />
    </div>
  )
}
