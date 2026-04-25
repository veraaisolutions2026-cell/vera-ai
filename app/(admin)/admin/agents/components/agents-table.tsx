"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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
import type { Agent } from "@/types/database"

type LayerName = "coach" | "intelligence"
type AdminAgentTab = {
  id: string
  name: string
  createdAt: string
}

function getLayerLabel(layers: LayerName[]): string {
  if (layers.length === 2) return "Coach + Intelligence"
  if (layers[0] === "coach") return "Coach only"
  return "Intelligence only"
}

function getLayersForAgent(
  map: Record<string, LayerName[]>,
  agentId: string
): LayerName[] {
  return map[agentId] ?? (["coach", "intelligence"] as LayerName[])
}

export function AgentsTable({
  agents,
  builtinLayerMap,
  customTabs,
  tabAssignments,
  selectedAgentIds,
  allVisibleSelected,
  onToggleAgent,
  onToggleSelectVisible,
}: {
  agents: Agent[]
  builtinLayerMap: Record<string, LayerName[]>
  customTabs: AdminAgentTab[]
  tabAssignments: Record<string, string[]>
  selectedAgentIds: string[]
  allVisibleSelected: boolean
  onToggleAgent: (agentId: string, checked: boolean) => void
  onToggleSelectVisible: (checked: boolean) => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmAgentId, setConfirmAgentId] = useState<string | null>(null)
  const [rowsPerPage, setRowsPerPage] = useState<10 | 20 | 50>(10)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(agents.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedAgents = agents.slice(startIndex, startIndex + rowsPerPage)
  const tabNameById = new Map(customTabs.map((tab) => [tab.id, tab.name]))
  const selectedAgent = confirmAgentId
    ? (agents.find((agent) => agent.id === confirmAgentId) ?? null)
    : null

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/admin/agents/${id}`, { method: "DELETE" })
    setDeleting(null)

    if (res.ok) {
      setConfirmAgentId(null)
      router.refresh()
      toast.success("Agent deleted.")
      return
    }

    const data = (await res.json().catch(() => ({}))) as { error?: string }
    toast.error(data.error ?? "Failed to delete agent.")
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 py-20 text-center">
        <p className="text-sm text-muted-foreground">No agents yet.</p>
        <Link
          href="/admin/agents/new"
          className="mt-3 text-sm underline underline-offset-4 hover:text-foreground"
        >
          Create the first agent
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {pagedAgents.length} of {agents.length} agent
          {agents.length !== 1 ? "s" : ""}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleSelectVisible(!allVisibleSelected)}
            className="inline-flex h-8 items-center rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:bg-accent"
          >
            {allVisibleSelected ? "Unselect visible" : "Select visible"}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                Rows: {rowsPerPage}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value) as 10 | 20 | 50)
                  setPage(1)
                }}
              >
                <DropdownMenuRadioItem value="10">10</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="20">20</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="50">50</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {pagedAgents.map((agent) =>
          (() => {
            const layers = getLayersForAgent(builtinLayerMap, agent.id)

            return (
              <div
                key={agent.id}
                className="rounded-xl border border-border/60 bg-background p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Checkbox
                      checked={selectedAgentIds.includes(agent.id)}
                      onCheckedChange={(value) =>
                        onToggleAgent(agent.id, value === true)
                      }
                      className="mt-1"
                      size="sm"
                    />

                    <div>
                      <p className="truncate text-sm font-medium">
                        {agent.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {agent.category ?? "Uncategorized"}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {agent.base_model}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(tabAssignments[agent.id] ?? []).map((tabId) => (
                          <span
                            key={`${agent.id}-${tabId}`}
                            className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tabNameById.get(tabId) ?? tabId}
                          </span>
                        ))}
                      </div>
                      {agent.is_builtin ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {getLayerLabel(layers)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 px-2.5 text-xs text-muted-foreground">
                        Select
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Agent actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          router.push(`/admin/agents/${agent.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setConfirmAgentId(agent.id)}
                        disabled={deleting === agent.id}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting === agent.id ? "Deleting..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })()
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/60 md:block">
        <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-foreground/2 text-left">
              <th className="px-4 py-3">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(value) =>
                    onToggleSelectVisible(value === true)
                  }
                  aria-label="Select visible agents"
                  size="sm"
                />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Category
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Model
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Layer Access
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Folders
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {pagedAgents.map((agent) =>
              (() => {
                const layers = getLayersForAgent(builtinLayerMap, agent.id)

                return (
                  <tr key={agent.id} className="group">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedAgentIds.includes(agent.id)}
                        onCheckedChange={(value) =>
                          onToggleAgent(agent.id, value === true)
                        }
                        aria-label={`Select ${agent.name}`}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{agent.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {agent.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {agent.base_model}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          agent.is_builtin
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-foreground/8 text-muted-foreground"
                        )}
                      >
                        {agent.is_builtin ? "Built-in" : "Custom"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {agent.is_builtin ? getLayerLabel(layers) : "User-owned"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(tabAssignments[agent.id] ?? []).length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(tabAssignments[agent.id] ?? []).map((tabId) => (
                            <span
                              key={`${agent.id}-${tabId}`}
                              className="rounded-full border border-border/60 px-2 py-0.5 text-[10px]"
                            >
                              {tabNameById.get(tabId) ?? tabId}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 px-2.5 text-xs text-muted-foreground">
                              Select
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Agent actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(`/admin/agents/${agent.id}`)
                              }
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setConfirmAgentId(agent.id)}
                              disabled={deleting === agent.id}
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deleting === agent.id ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })()
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={pageNumber === currentPage}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog
        open={Boolean(confirmAgentId)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setConfirmAgentId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAgent?.name
                ? `This will permanently delete ${selectedAgent.name}.`
                : "This will permanently delete this agent."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deleting)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmAgentId || Boolean(deleting)}
              onClick={() => {
                if (confirmAgentId) {
                  void handleDelete(confirmAgentId)
                }
              }}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete agent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
