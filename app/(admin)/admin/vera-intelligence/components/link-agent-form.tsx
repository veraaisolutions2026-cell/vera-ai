"use client"

import { useMemo, useState } from "react"
import { useFormStatus } from "react-dom"
import { Check, ChevronDown } from "lucide-react"
import { linkKnowledgeBaseFileToAgentAction } from "@/actions/admin-kb-actions"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { cn } from "@/lib/utils"

type AgentOption = {
  id: string
  name: string
  isBuiltin: boolean
}

type Props = {
  fileId: string
  agents: AgentOption[]
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
    >
      {pending ? "Attaching..." : "Attach"}
    </button>
  )
}

export function LinkAgentForm({ fileId, agents }: Props) {
  const [open, setOpen] = useState(false)
  const [agentId, setAgentId] = useState("")

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId) ?? null,
    [agentId, agents]
  )

  return (
    <form
      action={linkKnowledgeBaseFileToAgentAction}
      className="mt-2 flex flex-col gap-2 sm:flex-row"
    >
      <input type="hidden" name="fileId" value={fileId} />
      <input type="hidden" name="agentId" value={agentId} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm sm:min-w-70"
          >
            <span className="truncate text-left">
              {selectedAgent
                ? `${selectedAgent.name}${selectedAgent.isBuiltin ? " (built-in)" : ""}`
                : "Select agent"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="max-h-72 w-(--radix-popover-trigger-width) overflow-y-auto p-1"
        >
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => {
                setAgentId(agent.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <span className="min-w-0 flex-1 truncate">
                {agent.name}
                {agent.isBuiltin ? " (built-in)" : ""}
              </span>
              <Check
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground",
                  agentId === agent.id ? "opacity-100" : "opacity-0"
                )}
              />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <SubmitButton disabled={!agentId} />
    </form>
  )
}
