"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@/components/animate-ui/components/animate/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog"
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox"
import { AgentsTable } from "./agents-table"
import type { Agent } from "@/types/database"

type LayerName = "coach" | "intelligence"

type AdminAgentTab = {
  id: string
  name: string
  createdAt: string
}

type Props = {
  agents: Agent[]
  builtinLayerMap: Record<string, LayerName[]>
  customTabs: AdminAgentTab[]
  tabAssignments: Record<string, string[]>
}

export function AdminAgentTabs({
  agents,
  builtinLayerMap,
  customTabs,
  tabAssignments,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [newTabName, setNewTabName] = useState("")
  const [isCreatingTab, setIsCreatingTab] = useState(false)
  const [isDeletingTab, setIsDeletingTab] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([])
  const [localCustomTabs, setLocalCustomTabs] = useState(customTabs)
  const [localAssignments, setLocalAssignments] = useState(tabAssignments)

  useEffect(() => {
    setLocalCustomTabs(customTabs)
  }, [customTabs])

  useEffect(() => {
    setLocalAssignments(tabAssignments)
  }, [tabAssignments])

  const customAgents = useMemo(
    () => agents.filter((a) => !a.is_builtin),
    [agents]
  )

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    for (const tab of localCustomTabs) {
      counts[tab.id] = 0
    }

    for (const tabIds of Object.values(localAssignments)) {
      for (const tabId of tabIds) {
        if (tabId in counts) {
          counts[tabId] += 1
        }
      }
    }

    return counts
  }, [localCustomTabs, localAssignments])

  const filteredAgents = useMemo(() => {
    if (activeTab === "all") return agents
    if (activeTab === "custom") return customAgents

    if (!activeTab.startsWith("tab:")) {
      return agents
    }

    const tabId = activeTab.slice(4)

    return agents.filter((agent) => {
      const agentTabIds = localAssignments[agent.id] ?? []
      return agentTabIds.includes(tabId)
    })
  }, [activeTab, agents, customAgents, localAssignments])

  const activeCustomTab = activeTab.startsWith("tab:")
    ? localCustomTabs.find((tab) => tab.id === activeTab.slice(4))
    : null

  const visibleAgentIds = filteredAgents.map((agent) => agent.id)
  const allVisibleSelected =
    visibleAgentIds.length > 0 &&
    visibleAgentIds.every((id) => selectedAgentIds.includes(id))

  async function handleCreateTab(e: React.FormEvent) {
    e.preventDefault()
    if (!newTabName.trim() || isCreatingTab) return

    setIsCreatingTab(true)
    const res = await fetch("/api/admin/agent-tabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTabName.trim() }),
    })
    setIsCreatingTab(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(payload?.error ?? "Failed to create folder")
      return
    }

    const tab = (await res.json()) as AdminAgentTab
    setLocalCustomTabs((prev) => [...prev, tab])
    setNewTabName("")
    setActiveTab(`tab:${tab.id}`)
    router.refresh()
    toast.success("Folder created")
  }

  async function handleDeleteActiveTab() {
    if (!activeCustomTab || isDeletingTab) return

    setIsDeletingTab(true)
    const res = await fetch(`/api/admin/agent-tabs/${activeCustomTab.id}`, {
      method: "DELETE",
    })
    setIsDeletingTab(false)

    if (!res.ok) {
      toast.error("Failed to delete folder")
      return
    }

    setLocalCustomTabs((prev) =>
      prev.filter((tab) => tab.id !== activeCustomTab.id)
    )
    setLocalAssignments((prev) => {
      const next: Record<string, string[]> = {}

      for (const [agentId, tabIds] of Object.entries(prev)) {
        const remaining = tabIds.filter((id) => id !== activeCustomTab.id)
        if (remaining.length > 0) {
          next[agentId] = remaining
        }
      }

      return next
    })
    setActiveTab("all")
    setIsDeleteDialogOpen(false)
    router.refresh()
    toast.success("Folder deleted")
  }

  function toggleAgent(agentId: string, checked: boolean) {
    setSelectedAgentIds((prev) => {
      if (checked) {
        if (prev.includes(agentId)) return prev
        return [...prev, agentId]
      }

      return prev.filter((id) => id !== agentId)
    })
  }

  function handleSelectVisible(checked: boolean) {
    if (!checked) {
      setSelectedAgentIds((prev) =>
        prev.filter((id) => !visibleAgentIds.includes(id))
      )
      return
    }

    setSelectedAgentIds((prev) =>
      Array.from(new Set([...prev, ...visibleAgentIds]))
    )
  }

  function handleAgentsDeleted(agentIds: string[]) {
    const deletedIds = new Set(agentIds)

    setSelectedAgentIds((prev) => prev.filter((id) => !deletedIds.has(id)))
    setSelectedFolderIds([])
  }

  async function handleApplyFolders() {
    if (selectedAgentIds.length === 0 || isAssigning) return

    setIsAssigning(true)
    const res = await fetch("/api/admin/agent-tabs/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_ids: selectedAgentIds,
        tab_ids: selectedFolderIds,
      }),
    })
    setIsAssigning(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(payload?.error ?? "Failed to apply folder assignment")
      return
    }

    setLocalAssignments((prev) => {
      const next = { ...prev }

      for (const agentId of selectedAgentIds) {
        if (selectedFolderIds.length === 0) {
          delete next[agentId]
        } else {
          next[agentId] = selectedFolderIds
        }
      }

      return next
    })

    router.refresh()
    toast.success("Folder assignment updated")
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium">Custom folders</p>
            <p className="text-xs text-muted-foreground">
              Create tabs to organize agents into one or many admin folders.
            </p>
          </div>

          <form onSubmit={handleCreateTab} className="flex items-center gap-2">
            <input
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="New folder name"
              className="h-9 rounded-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-foreground/40"
              maxLength={40}
            />
            <button
              type="submit"
              disabled={!newTabName.trim() || isCreatingTab}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {isCreatingTab ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create folder
            </button>
          </form>
        </div>

        {activeCustomTab ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Active folder:{" "}
              <span className="font-medium text-foreground">
                {activeCustomTab.name}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeletingTab}
              className="inline-flex items-center gap-1 rounded-full border border-destructive/30 px-2.5 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
            >
              {isDeletingTab ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete folder
            </button>
          </div>
        ) : null}

        {selectedAgentIds.length > 0 ? (
          <div className="mt-3 rounded-xl border border-border/50 bg-background/70 p-3">
            <p className="text-xs font-medium">
              {selectedAgentIds.length} selected agent
              {selectedAgentIds.length !== 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose one or many folders, then apply. Leave all unchecked to
              remove from folders.
            </p>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {localCustomTabs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Create a folder first.
                </p>
              ) : (
                localCustomTabs.map((tab) => (
                  <label
                    key={tab.id}
                    className="flex items-center gap-2 rounded-full border border-border/50 px-3 py-1.5 text-xs"
                  >
                    <Checkbox
                      checked={selectedFolderIds.includes(tab.id)}
                      onCheckedChange={(value) => {
                        const checked = value === true
                        setSelectedFolderIds((prev) => {
                          if (checked) return [...prev, tab.id]
                          return prev.filter((id) => id !== tab.id)
                        })
                      }}
                      size="sm"
                    />
                    {tab.name}
                  </label>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyFolders}
                disabled={isAssigning || localCustomTabs.length === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {isAssigning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Apply folders
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAgentIds([])
                  setSelectedFolderIds([])
                }}
                className="inline-flex h-8 items-center rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
              >
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!isDeletingTab) {
              setIsDeleteDialogOpen(open)
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete folder?</AlertDialogTitle>
              <AlertDialogDescription>
                {activeCustomTab
                  ? `This removes ${activeCustomTab.name} and its assignments from agents.`
                  : "This removes this folder and its assignments from agents."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingTab}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!activeCustomTab || isDeletingTab}
                onClick={() => {
                  void handleDeleteActiveTab()
                }}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingTab ? "Deleting..." : "Delete folder"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <TabsList>
        <TabsTrigger value="all">All ({agents.length})</TabsTrigger>
        <TabsTrigger value="custom">Custom ({customAgents.length})</TabsTrigger>
        {localCustomTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={`tab:${tab.id}`}>
            {tab.name} ({tabCounts[tab.id] ?? 0})
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContents>
        <TabsContent value="all">
          <AgentsTable
            agents={filteredAgents}
            builtinLayerMap={builtinLayerMap}
            customTabs={localCustomTabs}
            tabAssignments={localAssignments}
            selectedAgentIds={selectedAgentIds}
            allVisibleSelected={allVisibleSelected}
            onToggleAgent={toggleAgent}
            onToggleSelectVisible={handleSelectVisible}
            onAgentsDeleted={handleAgentsDeleted}
          />
        </TabsContent>
        <TabsContent value="custom">
          <AgentsTable
            agents={filteredAgents}
            builtinLayerMap={builtinLayerMap}
            customTabs={localCustomTabs}
            tabAssignments={localAssignments}
            selectedAgentIds={selectedAgentIds}
            allVisibleSelected={allVisibleSelected}
            onToggleAgent={toggleAgent}
            onToggleSelectVisible={handleSelectVisible}
            onAgentsDeleted={handleAgentsDeleted}
          />
        </TabsContent>
        {localCustomTabs.map((tab) => (
          <TabsContent key={tab.id} value={`tab:${tab.id}`}>
            <AgentsTable
              agents={filteredAgents}
              builtinLayerMap={builtinLayerMap}
              customTabs={localCustomTabs}
              tabAssignments={localAssignments}
              selectedAgentIds={selectedAgentIds}
              allVisibleSelected={allVisibleSelected}
              onToggleAgent={toggleAgent}
              onToggleSelectVisible={handleSelectVisible}
              onAgentsDeleted={handleAgentsDeleted}
            />
          </TabsContent>
        ))}
      </TabsContents>
    </Tabs>
  )
}
