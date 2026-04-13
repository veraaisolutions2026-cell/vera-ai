"use client"

import { useState } from "react"
import { Bot, Check, ChevronDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { cn } from "@/lib/utils"
import { AgentIcon } from "@/components/agent-icon-picker"
import type { Agent } from "@/types/database"

type Props = {
  agents: Agent[]
  selectedAgent: Agent | null
  onSelect: (agent: Agent | null) => void
}

export function AgentSelector({ agents, selectedAgent, onSelect }: Props) {
  const [open, setOpen] = useState(false)

  const builtins = agents.filter((a) => a.is_builtin)
  const custom = agents.filter((a) => !a.is_builtin)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
            selectedAgent
              ? "bg-foreground/10 text-foreground hover:bg-foreground/15"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {selectedAgent ? (
            <>
              <AgentIcon
                name={selectedAgent.icon}
                className="h-3.5 w-3.5 shrink-0"
              />
              <span className="max-w-30 truncate">{selectedAgent.name}</span>
            </>
          ) : (
            <span>No agent</span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-72 w-64 overflow-y-auto p-1"
        sideOffset={8}
      >
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
            !selectedAgent && "text-muted-foreground"
          )}
          onClick={() => {
            onSelect(null)
            setOpen(false)
          }}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/6">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <span className="flex-1 text-left">No agent</span>
          {!selectedAgent && <Check className="h-3.5 w-3.5 opacity-60" />}
        </button>

        {builtins.length > 0 && (
          <>
            <p className="mt-1 px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
              Built-in
            </p>
            {builtins.map((agent) => (
              <button
                key={agent.id}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  onSelect(agent)
                  setOpen(false)
                }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/6">
                  <AgentIcon name={agent.icon} className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate leading-none">{agent.name}</p>
                  {agent.description && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {agent.description}
                    </p>
                  )}
                </div>
                {selectedAgent?.id === agent.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </button>
            ))}
          </>
        )}

        {custom.length > 0 && (
          <>
            <p className="mt-1 px-3 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
              My agents
            </p>
            {custom.map((agent) => (
              <button
                key={agent.id}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  onSelect(agent)
                  setOpen(false)
                }}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/6">
                  <AgentIcon name={agent.icon} className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate leading-none">{agent.name}</p>
                  {agent.description && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {agent.description}
                    </p>
                  )}
                </div>
                {selectedAgent?.id === agent.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
