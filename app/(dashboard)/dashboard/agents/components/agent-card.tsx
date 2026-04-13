"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
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
import { deleteUserAgent } from "@/actions/agent-actions"
import { AgentIcon } from "@/components/agent-icon-picker"
import { getModelLabel } from "@/lib/models"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types/database"

type Props = {
  agent: Agent
  editable?: boolean
}

export function AgentCard({ agent, editable = false }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAgent(agent.id)
      if (result && "error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Agent deleted")
      }
    })
  }

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl bg-card p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] ring-1 ring-border/30 transition-all dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,255,255,0.04)] dark:ring-0",
          editable
            ? "hover:ring-border/60 dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_0_1px_rgba(255,255,255,0.07)]"
            : "opacity-90",
          isPending && "pointer-events-none opacity-50"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/6">
              <AgentIcon
                name={agent.icon}
                className="h-4.5 w-4.5 text-foreground/70"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-medium">
                {agent.name}
              </p>
              {agent.category && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {agent.category}
                </p>
              )}
            </div>
          </div>

          {editable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100"
                  aria-label="Agent options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-36">
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-xs"
                  onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-foreground/8">
              Built-in
            </span>
          )}
        </div>

        {/* Description */}
        {agent.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {agent.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/60">
            {getModelLabel(agent.base_model)}
          </span>
          {editable && (
            <Link
              href={`/dashboard/agents/${agent.id}`}
              className="text-[11px] text-muted-foreground underline-offset-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground hover:underline"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{agent.name}&rdquo; will be permanently deleted. Any chats
              using this agent will no longer have access to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
