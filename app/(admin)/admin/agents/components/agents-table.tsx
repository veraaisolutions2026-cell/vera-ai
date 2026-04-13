"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types/database"

export function AgentsTable({ agents }: { agents: Agent[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

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
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full text-sm">
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
          {agents.map((agent) => (
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
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Link
                    href={`/admin/agents/${agent.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(agent.id)}
                    disabled={deleting === agent.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
