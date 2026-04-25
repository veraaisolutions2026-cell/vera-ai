import { getAdminAgentTabsState } from "@/lib/db/admin-agent-tabs"
import { getAllAgents } from "@/lib/db/admin"
import { filterBuiltinAgentsForLayer } from "@/lib/db/builtin-agent-layer-access"
import { createServiceClient } from "@/lib/supabase/service"
import { AgentLinkingPanelClient } from "./agent-linking-panel-client"

export async function AgentLinkingPanel() {
  const service = createServiceClient()

  const [allAgents, tabsState, linksResult, filesResult] = await Promise.all([
    getAllAgents(),
    getAdminAgentTabsState(),
    service
      .from("agent_knowledge_base_files")
      .select("agent_id, file_id, created_at")
      .order("created_at", { ascending: false }),
    service
      .from("knowledge_base_files")
      .select("id, name")
      .order("created_at", { ascending: false }),
  ])

  const links = linksResult.data ?? []
  const files = filesResult.data ?? []
  const agents = (
    await filterBuiltinAgentsForLayer(allAgents, "intelligence")
  ).filter((agent) => agent.is_builtin)

  const linksByAgentId = new Map<string, Set<string>>()
  const sortedTabs = [...tabsState.tabs].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]))

  for (const link of links) {
    const current = linksByAgentId.get(link.agent_id) ?? new Set<string>()
    current.add(link.file_id)
    linksByAgentId.set(link.agent_id, current)
  }

  const groupedAgents = sortedTabs.map((tab) => {
    const tabAgents = agents.filter((agent) =>
      (tabsState.assignments[agent.id] ?? []).includes(tab.id)
    )

    return {
      id: tab.id,
      name: tab.name,
      agents: tabAgents,
    }
  })

  const assignedAgentIds = new Set(
    Object.keys(tabsState.assignments).filter((agentId) =>
      agentsById.has(agentId)
    )
  )
  const unassignedAgents = agents.filter(
    (agent) => !assignedAgentIds.has(agent.id)
  )

  const linkedByAgent = Object.fromEntries(
    [...linksByAgentId.entries()].map(([agentId, fileIdSet]) => [
      agentId,
      [...fileIdSet],
    ])
  )

  return agents.length === 0 ? (
    <p className="text-sm text-muted-foreground">
      No agents found. Create agents before managing knowledge links.
    </p>
  ) : (
    <AgentLinkingPanelClient
      files={files.map((file) => ({ id: file.id, name: file.name }))}
      groups={groupedAgents.map((group) => ({
        id: group.id,
        name: group.name,
        agents: group.agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
        })),
      }))}
      unassignedAgents={unassignedAgents.map((agent) => ({
        id: agent.id,
        name: agent.name,
      }))}
      initialLinkedByAgent={linkedByAgent}
    />
  )
}
