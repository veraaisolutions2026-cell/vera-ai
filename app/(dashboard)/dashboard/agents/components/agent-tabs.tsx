"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@/components/animate-ui/components/animate/tabs"
import { updateFavoriteAgents } from "@/actions/sidebar-actions"
import type { AdminAgentTab } from "@/lib/db/admin-agent-tabs"
import { AgentCard } from "./agent-card"
import type { Agent } from "@/types/database"

type Props = {
  builtinAgents: Agent[]
  userAgents: Agent[]
  allowCustomAgentCrud?: boolean
  initialFavoriteAgentIds: string[]
  customTabs: AdminAgentTab[]
  tabAssignments: Record<string, string[]>
}

export function AgentTabs({
  builtinAgents,
  userAgents,
  allowCustomAgentCrud = true,
  initialFavoriteAgentIds,
  customTabs,
  tabAssignments,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [favoriteIds, setFavoriteIds] = useState(initialFavoriteAgentIds)
  const [isSavingFavorites, startSavingFavorites] = useTransition()
  const allAgents = useMemo(
    () => [...userAgents, ...builtinAgents],
    [userAgents, builtinAgents]
  )
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
  const agentNameById = useMemo(
    () => new Map(allAgents.map((agent) => [agent.id, agent.name])),
    [allAgents]
  )
  const visibleCustomTabs = useMemo(
    () =>
      customTabs.filter((tab) =>
        allAgents.some((agent) =>
          (tabAssignments[agent.id] ?? []).includes(tab.id)
        )
      ),
    [allAgents, customTabs, tabAssignments]
  )
  const customTabCounts = useMemo(
    () =>
      Object.fromEntries(
        visibleCustomTabs.map((tab) => [
          tab.id,
          allAgents.filter((agent) =>
            (tabAssignments[agent.id] ?? []).includes(tab.id)
          ).length,
        ])
      ),
    [allAgents, tabAssignments, visibleCustomTabs]
  )
  const filteredAgents = useMemo(() => {
    if (activeTab === "all") return allAgents
    if (activeTab === "mine") return userAgents
    if (activeTab === "builtin") return builtinAgents

    if (activeTab.startsWith("group:")) {
      const tabId = activeTab.slice("group:".length)

      return allAgents.filter((agent) =>
        (tabAssignments[agent.id] ?? []).includes(tabId)
      )
    }

    return allAgents
  }, [activeTab, allAgents, builtinAgents, tabAssignments, userAgents])

  useEffect(() => {
    setFavoriteIds(initialFavoriteAgentIds)
  }, [initialFavoriteAgentIds])

  useEffect(() => {
    if (!activeTab.startsWith("group:")) return

    const tabId = activeTab.slice("group:".length)
    if (visibleCustomTabs.some((tab) => tab.id === tabId)) return

    setActiveTab("all")
  }, [activeTab, visibleCustomTabs])

  function handleToggleFavorite(agentId: string) {
    const previousIds = favoriteIds
    const wasFavorite = favoriteIdSet.has(agentId)
    const nextFavoriteIds = wasFavorite
      ? previousIds.filter((currentId) => currentId !== agentId)
      : [agentId, ...previousIds.filter((currentId) => currentId !== agentId)]

    setFavoriteIds(nextFavoriteIds)

    startSavingFavorites(async () => {
      const result = await updateFavoriteAgents(nextFavoriteIds)

      if (result?.error) {
        setFavoriteIds(previousIds)
        toast.error("Could not save favorite agents")
        return
      }

      setFavoriteIds(result.favoriteAgentIds)
      const agentName = agentNameById.get(agentId) ?? "Agent"
      toast.success(
        wasFavorite
          ? `${agentName} removed from favourites`
          : `${agentName} pinned to favourites`
      )
      router.refresh()
    })
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="all">All ({allAgents.length})</TabsTrigger>
        {allowCustomAgentCrud ? (
          <TabsTrigger value="mine">Mine ({userAgents.length})</TabsTrigger>
        ) : null}
        {visibleCustomTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={`group:${tab.id}`}>
            {tab.name} ({customTabCounts[tab.id] ?? 0})
          </TabsTrigger>
        ))}
        <TabsTrigger value="builtin">
          Built-in ({builtinAgents.length})
        </TabsTrigger>
      </TabsList>

      <TabsContents>
        {/* All */}
        <TabsContent value="all">
          {filteredAgents.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No agents available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  editable={!agent.is_builtin}
                  isFavorite={favoriteIdSet.has(agent.id)}
                  onToggleFavorite={handleToggleFavorite}
                  favoritePending={isSavingFavorites}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mine */}
        {allowCustomAgentCrud ? (
          <TabsContent value="mine">
            {filteredAgents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t created any agents yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    editable
                    isFavorite={favoriteIdSet.has(agent.id)}
                    onToggleFavorite={handleToggleFavorite}
                    favoritePending={isSavingFavorites}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ) : null}

        {/* Built-in */}
        <TabsContent value="builtin">
          {filteredAgents.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No built-in agents configured yet. Ask your admin to set them up.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  editable={false}
                  isFavorite={favoriteIdSet.has(agent.id)}
                  onToggleFavorite={handleToggleFavorite}
                  favoritePending={isSavingFavorites}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {visibleCustomTabs.map((tab) => (
          <TabsContent key={tab.id} value={`group:${tab.id}`}>
            {filteredAgents.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No agents available in this group yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    editable={!agent.is_builtin}
                    isFavorite={favoriteIdSet.has(agent.id)}
                    onToggleFavorite={handleToggleFavorite}
                    favoritePending={isSavingFavorites}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </TabsContents>
    </Tabs>
  )
}
