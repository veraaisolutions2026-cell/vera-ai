"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { updateAdminUnlimitedModeAction } from "@/actions/admin-unlimited-mode-actions"
import { Switch } from "@/components/animate-ui/components/radix/switch"

type Props = {
  defaultEnabled: boolean
}

export function AdminUnlimitedModeForm({ defaultEnabled }: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  const [savedEnabled, setSavedEnabled] = useState(defaultEnabled)
  const [isPending, startTransition] = useTransition()

  const isDirty = enabled !== savedEnabled

  function saveUnlimitedMode() {
    if (!isDirty || isPending) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set("adminUnlimitedMode", enabled ? "on" : "off")

      try {
        await updateAdminUnlimitedModeAction(formData)
        setSavedEnabled(enabled)
        toast.success(
          enabled
            ? "Unlimited mode enabled for this admin account."
            : "Unlimited mode disabled for this admin account."
        )
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save setting"
        )
      }
    })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        saveUnlimitedMode()
      }}
    >
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background p-4">
        <div>
          <p className="text-sm font-medium">Enable unlimited mode</p>
          <p className="mt-1 text-xs text-muted-foreground">
            When enabled, this admin account bypasses dashboard usage limits and
            gets full access regardless of plan.
          </p>
        </div>

        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable unlimited mode"
        />
      </div>

      <button
        type="submit"
        disabled={!isDirty || isPending}
        className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save setting"}
      </button>
    </form>
  )
}
