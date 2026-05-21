"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Check, ChevronDown, Search } from "lucide-react"
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
  const [query, setQuery] = useState("")
  const [contentSide, setContentSide] = useState<"top" | "bottom">("bottom")
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const deferredQuery = useDeferredValue(query)
  const orderedAgents = useMemo(
    () =>
      [...agents].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [agents]
  )
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const filteredAgents = useMemo(() => {
    if (!normalizedQuery) {
      return orderedAgents
    }

    return orderedAgents.filter((agent) => {
      const haystack = `${agent.name} ${agent.description ?? ""}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [normalizedQuery, orderedAgents])

  useEffect(() => {
    if (!open) return

    const VIEWPORT_PADDING = 8
    const ESTIMATED_CONTENT_HEIGHT = 360

    const updatePopoverSide = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING
      const spaceAbove = rect.top - VIEWPORT_PADDING

      if (
        spaceBelow < ESTIMATED_CONTENT_HEIGHT &&
        spaceAbove > Math.max(spaceBelow, 120)
      ) {
        setContentSide("top")
        return
      }

      setContentSide("bottom")
    }

    updatePopoverSide()
    window.addEventListener("resize", updatePopoverSide)
    window.addEventListener("scroll", updatePopoverSide, true)

    return () => {
      window.removeEventListener("resize", updatePopoverSide)
      window.removeEventListener("scroll", updatePopoverSide, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          data-testid="chat-agent-selector-trigger"
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
        side={contentSide}
        align="start"
        collisionPadding={8}
        avoidCollisions
        className="w-72 p-0"
        sideOffset={8}
      >
        <div className="border-b border-border/50 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search agents"
              data-testid="chat-agent-search"
              className="h-9 w-full rounded-full border border-border/60 bg-background px-9 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground/70 focus:border-border"
            />
          </div>
        </div>

        <div className="max-h-[min(18rem,calc(100vh-4.75rem))] overflow-y-auto p-1">
          <button
            data-testid="chat-agent-option-none"
            className={cn(
              "mb-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
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

          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <button
                key={agent.id}
                data-testid="chat-agent-option"
                data-agent-id={agent.id}
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
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {agent.description}
                    </p>
                  )}
                </div>
                {selectedAgent?.id === agent.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No agents match your search.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
