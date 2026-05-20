"use client"

import { useEffect, useState } from "react"
import { AgentSelector } from "./agent-selector"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types/database"

type Props = {
  agents: Agent[]
  selectedAgent: Agent | null
  onAgentChange: (agent: Agent | null) => void
}

export function ChatAgentBar({ agents, selectedAgent, onAgentChange }: Props) {
  const [isClientReady, setIsClientReady] = useState(false)

  useEffect(() => {
    setIsClientReady(true)
  }, [])

  return (
    <div className="flex items-center justify-start">
      {isClientReady ? (
        <AgentSelector
          agents={agents}
          selectedAgent={selectedAgent}
          onSelect={onAgentChange}
        />
      ) : (
        <button
          type="button"
          disabled
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium opacity-60",
            selectedAgent
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground"
          )}
        >
          {selectedAgent ? selectedAgent.name : "No agent"}
        </button>
      )}
    </div>
  )
}
