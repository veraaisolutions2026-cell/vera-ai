"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { areEquivalentModelIds, getModelLabel } from "@/lib/models"
import { useAvailableModels } from "@/hooks/use-available-models"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (id: string) => void
}

export function ModelPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { models, refresh } = useAvailableModels()
  const current = models.find((model) => areEquivalentModelIds(model.id, value))
  const displayLabel = current?.fullLabel ?? getModelLabel(value)

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="model-picker-trigger"
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm transition-colors",
            "hover:border-border/80 focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20 focus:outline-none",
            open && "border-foreground/40 ring-1 ring-foreground/20"
          )}
        >
          <span
            className={current ? "text-foreground" : "text-muted-foreground"}
          >
            {displayLabel}
          </span>
          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-72 w-64 overflow-y-auto p-1"
        sideOffset={6}
      >
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            data-testid="model-picker-option"
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
              <Check className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
