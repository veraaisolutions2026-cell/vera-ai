"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"
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
import type { Agent } from "@/types/database"

export function AgentsTable({ agents }: { agents: Agent[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [rowsPerPage, setRowsPerPage] = useState<10 | 20 | 50>(10)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(agents.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedAgents = agents.slice(startIndex, startIndex + rowsPerPage)

  async function handleDelete(id: string) {
    if (!confirm("Delete this agent? This cannot be undone.")) return
    setDeleting(id)
    const res = await fetch(`/api/admin/agents/${id}`, { method: "DELETE" })
    setDeleting(null)
    if (res.ok) router.refresh()
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
          Showing {pagedAgents.length} of {agents.length} built-in agents
        </p>

        <div className="flex items-center gap-2">
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
        {pagedAgents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl border border-border/60 bg-background p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{agent.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {agent.category ?? "Uncategorized"}
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {agent.base_model}
                </p>
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
                    onSelect={() => router.push(`/admin/agents/${agent.id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDelete(agent.id)}
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
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/60 md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-foreground/[0.02] text-left">
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
                Created
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {pagedAgents.map((agent) => (
              <tr key={agent.id} className="group">
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
                          onSelect={() => handleDelete(agent.id)}
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
            ))}
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
    </div>
  )
}
