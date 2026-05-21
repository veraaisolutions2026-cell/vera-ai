"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { areEquivalentModelIds, getModelLabel } from "@/lib/models"
import { cn } from "@/lib/utils"
import { useAvailableModels } from "@/hooks/use-available-models"

export type ModelId = string

type Props = {
  value: string
  onChange: (model: ModelId) => void
  className?: string
}

export function ModelSelector({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const { models, refresh } = useAvailableModels()
  const orderedModels = useMemo(() => {
    const familyOrder = { haiku: 0, sonnet: 1, opus: 2 } as const
    return [...models].sort(
      (a, b) => familyOrder[a.family] - familyOrder[b.family]
    )
  }, [models])
  const matchedModel = orderedModels.find((model) =>
    areEquivalentModelIds(model.id, value)
  )
  const current = matchedModel ?? orderedModels[0]
  const currentLabel = matchedModel?.label ?? getModelLabel(value)

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="chat-model-selector"
          className={cn(
            "flex h-10 max-w-38 items-center gap-1.5 rounded-full border border-border/65 bg-background/72 px-3.5 text-sm font-medium text-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-accent/70 hover:text-foreground",
            className
          )}
        >
          <span className="min-w-0 truncate">{currentLabel}</span>
          <span className="shrink-0 opacity-50">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-72 w-72 overflow-y-auto rounded-[1.25rem] p-1.5"
        sideOffset={8}
      >
        {orderedModels.map((model) => (
          <button
            key={model.id}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
            onClick={() => {
              onChange(model.id)
              setOpen(false)
            }}
          >
            <div className="min-w-0 flex-1 text-left">
              <p className="leading-none font-medium">{model.fullLabel}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {model.description}
              </p>
            </div>
            {areEquivalentModelIds(value, model.id) && (
              <CheckIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
