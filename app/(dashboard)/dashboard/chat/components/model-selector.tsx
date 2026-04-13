"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { getModelLabel } from "@/lib/models"
import { useAvailableModels } from "@/hooks/use-available-models"

export type ModelId = string

type Props = {
  value: string
  onChange: (model: ModelId) => void
}

export function ModelSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { models, refresh } = useAvailableModels()
  const orderedModels = useMemo(() => {
    const familyOrder = { haiku: 0, sonnet: 1, opus: 2 } as const
    return [...models].sort(
      (a, b) => familyOrder[a.family] - familyOrder[b.family]
    )
  }, [models])
  const current = orderedModels.find((m) => m.id === value) ?? orderedModels[0]
  const currentLabel = current?.label ?? getModelLabel(value)

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          {currentLabel}
          <span className="ml-0.5 opacity-50">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-72 w-64 overflow-y-auto p-1"
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
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {model.description}
              </p>
            </div>
            {value === model.id && (
              <CheckIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
