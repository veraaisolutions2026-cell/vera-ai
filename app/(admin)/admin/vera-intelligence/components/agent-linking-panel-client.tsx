"use client"

import { useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox"
import { Input } from "@/components/ui/input"

type FileItem = {
  id: string
  name: string
}

type AgentItem = {
  id: string
  name: string
}

type AgentGroup = {
  id: string
  name: string
  agents: AgentItem[]
}

type Props = {
  files: FileItem[]
  groups: AgentGroup[]
  unassignedAgents: AgentItem[]
  initialLinkedByAgent: Record<string, string[]>
}

export function AgentLinkingPanelClient({
  files,
  groups,
  unassignedAgents,
  initialLinkedByAgent,
}: Props) {
  const [query, setQuery] = useState("")
  const [linkedByAgent, setLinkedByAgent] =
    useState<Record<string, string[]>>(initialLinkedByAgent)
  const [savingByAgent, setSavingByAgent] = useState<Record<string, boolean>>(
    {}
  )

  const normalizedQuery = query.trim().toLowerCase()
  const isFiltering = normalizedQuery.length > 0

  const filteredGroups = useMemo(() => {
    if (!isFiltering) return groups

    return groups
      .map((group) => ({
        ...group,
        agents: group.agents.filter((agent) =>
          agent.name.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((group) => group.agents.length > 0)
  }, [groups, isFiltering, normalizedQuery])

  const filteredUnassignedAgents = useMemo(() => {
    if (!isFiltering) return unassignedAgents

    return unassignedAgents.filter((agent) =>
      agent.name.toLowerCase().includes(normalizedQuery)
    )
  }, [isFiltering, normalizedQuery, unassignedAgents])

  const linkedCount = useMemo(
    () =>
      Object.values(linkedByAgent).reduce((sum, ids) => sum + ids.length, 0),
    [linkedByAgent]
  )

  const agentsLinkedCount = useMemo(
    () => Object.values(linkedByAgent).filter((ids) => ids.length > 0).length,
    [linkedByAgent]
  )

  function toggleFile(agentId: string, fileId: string, checked: boolean) {
    setLinkedByAgent((prev) => {
      const current = prev[agentId] ?? []
      const next = checked
        ? current.includes(fileId)
          ? current
          : [...current, fileId]
        : current.filter((id) => id !== fileId)

      return {
        ...prev,
        [agentId]: next,
      }
    })
  }

  async function saveLinks(agentId: string) {
    const fileIds = linkedByAgent[agentId] ?? []

    setSavingByAgent((prev) => ({ ...prev, [agentId]: true }))

    const res = await fetch("/api/admin/knowledge-base/agent-links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, fileIds }),
    })

    setSavingByAgent((prev) => ({ ...prev, [agentId]: false }))

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(payload?.error ?? "Failed to save links")
      return
    }

    toast.success("Links updated")
  }

  function renderAgentCard(agent: AgentItem) {
    const selectedFileIds = new Set(linkedByAgent[agent.id] ?? [])
    const isSaving = Boolean(savingByAgent[agent.id])

    return (
      <div
        key={agent.id}
        className="rounded-2xl border border-border/50 bg-muted/20 p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{agent.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {selectedFileIds.size} linked file
              {selectedFileIds.size === 1 ? "" : "s"}
            </p>
          </div>
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
            built-in
          </span>
        </div>

        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Upload knowledge base PDFs first.
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border/50 bg-background/50 p-2.5">
            {files.map((file) => {
              const inputId = `agent-${agent.id}-file-${file.id}`
              const checked = selectedFileIds.has(file.id)

              return (
                <label
                  key={file.id}
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/40 px-2.5 py-2 text-xs transition-colors hover:bg-muted/30"
                >
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    onCheckedChange={(value) => {
                      toggleFile(agent.id, file.id, value === true)
                    }}
                    size="sm"
                  />
                  <span className="line-clamp-1">{file.name}</span>
                </label>
              )
            })}
          </div>
        )}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              void saveLinks(agent.id)
            }}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isSaving ? "Saving..." : "Save links"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground uppercase">Total links</p>
          <p className="mt-1 text-xl font-semibold">{linkedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground uppercase">
            Agents linked
          </p>
          <p className="mt-1 text-xl font-semibold">{agentsLinkedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground uppercase">
            Files available
          </p>
          <p className="mt-1 text-xl font-semibold">{files.length}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search agents"
          className="pl-8"
        />
      </div>

      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <section
            key={group.id}
            className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">
                {group.name}
              </h3>
              <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
                {group.agents.length} agent
                {group.agents.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {group.agents.map((agent) => renderAgentCard(agent))}
            </div>
          </section>
        ))}

        <section className="space-y-3 rounded-2xl border border-border/50 bg-background/70 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Unassigned</h3>
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
              {filteredUnassignedAgents.length} agent
              {filteredUnassignedAgents.length === 1 ? "" : "s"}
            </span>
          </div>

          {filteredUnassignedAgents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isFiltering
                ? "No matching unassigned agents."
                : "All intelligence agents are assigned to folders."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredUnassignedAgents.map((agent) => renderAgentCard(agent))}
            </div>
          )}
        </section>

        {isFiltering &&
        filteredGroups.length === 0 &&
        filteredUnassignedAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents match your search.
          </p>
        ) : null}

        <div className="rounded-2xl border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
          Linked files are automatically injected into the selected agent&apos;s
          chat context during conversation.
        </div>
      </div>
    </div>
  )
}
