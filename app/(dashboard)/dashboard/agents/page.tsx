import Link from "next/link"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAdminAgentTabsState } from "@/lib/db/admin-agent-tabs"
import { getBuiltinAgents, getUserAgents } from "@/lib/db/agents"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { UpgradeCreateAgentButton } from "./components/upgrade-create-agent-button"
import { AgentTabs } from "./components/agent-tabs"

export const metadata = {
  title: "Agents - Vera AI",
}

export default async function AgentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const layerAccess = await getUserLayerAccess(user.id)

  if (!layerAccess.allowBuiltInAgents && !layerAccess.allowCustomAgentCrud) {
    redirect("/dashboard/chat")
  }

  const [builtinAgents, userAgents, profileResult, tabState] =
    await Promise.all([
      layerAccess.allowBuiltInAgents
        ? getBuiltinAgents(layerAccess.layer)
        : Promise.resolve([]),
      layerAccess.allowCustomAgentCrud
        ? getUserAgents(user.id)
        : Promise.resolve([]),
      supabase
        .from("profiles")
        .select("favorite_agent_ids")
        .eq("id", user.id)
        .single(),
      getAdminAgentTabsState(),
    ])

  const favoriteAgentIds = Array.isArray(profileResult.data?.favorite_agent_ids)
    ? profileResult.data.favorite_agent_ids
    : []

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {layerAccess.allowCustomAgentCrud
              ? "Browse built-in agents or create your own custom agents."
              : "Browse available built-in agents for your package."}
          </p>
        </div>
        {layerAccess.allowCustomAgentCrud ? (
          <Link
            href="/dashboard/agents/new"
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create agent
          </Link>
        ) : null}
        {!layerAccess.allowCustomAgentCrud ? (
          <UpgradeCreateAgentButton plan={layerAccess.plan} />
        ) : null}
      </div>

      <AgentTabs
        builtinAgents={builtinAgents}
        userAgents={userAgents}
        allowCustomAgentCrud={layerAccess.allowCustomAgentCrud}
        initialFavoriteAgentIds={favoriteAgentIds}
        customTabs={tabState.tabs}
        tabAssignments={tabState.assignments}
      />
    </div>
  )
}
