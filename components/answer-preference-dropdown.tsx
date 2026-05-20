"use client"

import { Check, ChevronDown, TextQuote } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import {
  ANSWER_PREFERENCE_OPTIONS,
  getAnswerPreferenceLabel,
  getAnswerPreferenceShortLabel,
  type AnswerPreference,
} from "@/lib/answer-preference"
import { cn } from "@/lib/utils"

type Props = {
  value: AnswerPreference | null
  onChange: (value: AnswerPreference) => void
  disabled?: boolean
  compact?: boolean
  align?: "start" | "end"
  triggerClassName?: string
  contentClassName?: string
  dataTestId?: string
}

export function AnswerPreferenceDropdown({
  value,
  onChange,
  disabled = false,
  compact = false,
  align = "end",
  triggerClassName,
  contentClassName,
  dataTestId,
}: Props) {
  const triggerLabel = compact
    ? getAnswerPreferenceShortLabel(value)
    : getAnswerPreferenceLabel(value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            compact
              ? "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              : "flex h-9 items-center gap-2 rounded-full border border-border/60 bg-background px-3 text-sm transition-colors hover:bg-foreground/4 focus:outline-none disabled:opacity-50 data-[state=open]:bg-foreground/4",
            triggerClassName
          )}
        >
          <TextQuote
            className={
              compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5 text-muted-foreground"
            }
          />
          <span className="font-medium">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("w-64 rounded-xl p-1.5", contentClassName)}
      >
        {ANSWER_PREFERENCE_OPTIONS.map((option) => {
          const isSelected = value === option.value

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              data-testid={
                dataTestId ? `${dataTestId}-${option.value}` : undefined
              }
              className={cn(
                "items-start gap-3 rounded-xl px-3 py-2.5",
                isSelected && "font-medium"
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-none text-foreground">
                  {option.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {isSelected ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
