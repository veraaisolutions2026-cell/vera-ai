"use client"

import { useState } from "react"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

type Props = {
  initialPrompt: string
  initialUpdatedAt: string | null
  source: "configured" | "default"
}

type Mode = "view" | "edit" | "preview"

export function AcaManager({ initialPrompt, initialUpdatedAt, source }: Props) {
  const [currentPrompt, setCurrentPrompt] = useState(initialPrompt)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(initialPrompt)
  const [mode, setMode] = useState<Mode>("view")
  const [promptSource, setPromptSource] = useState<"configured" | "default">(
    source
  )

  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  async function handleSave(promptToSave: string) {
    if (!promptToSave.trim()) {
      toast.error("Prompt cannot be empty.")
      return
    }

    setSaving(true)

    const res = await fetch("/api/admin/aca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptToSave }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      toast.error(data.error ?? "Failed to save Travers prompt.")
      return
    }

    setCurrentPrompt(promptToSave)
    setEditValue(promptToSave)
    setPreviewPrompt(null)
    setUpdatedAt(new Date().toISOString())
    setPromptSource("configured")
    setMode("view")
    toast.success("Travers prompt saved successfully.")
  }

  async function handleResetToDefault() {
    setSaving(true)

    const res = await fetch("/api/admin/aca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-default" }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      toast.error(data.error ?? "Failed to restore default Travers prompt.")
      return
    }

    const data = (await res.json()) as {
      prompt?: string
      updated_at?: string
    }
    const nextPrompt = data.prompt ?? currentPrompt

    setCurrentPrompt(nextPrompt)
    setEditValue(nextPrompt)
    setPreviewPrompt(null)
    setUpdatedAt(data.updated_at ?? new Date().toISOString())
    setPromptSource("default")
    setMode("view")
    setResetOpen(false)

    toast.success("Restored the default Travers prompt.")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {promptSource === "default" ? (
          <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">
            Using default Travers prompt
          </span>
        ) : null}
        {updatedAt ? (
          <span>Last saved: {new Date(updatedAt).toLocaleString()}</span>
        ) : null}
      </div>

      {/* Prompt editor / viewer */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            {mode === "preview"
              ? "Formatted Preview - review before saving"
              : mode === "edit"
                ? "Edit Travers Prompt"
                : "Current Travers Master Prompt"}
          </h2>
          <div className="flex items-center gap-2">
            {mode === "view" && currentPrompt && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(currentPrompt)
                    setMode("edit")
                  }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Edit manually
                </button>
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Reset to default
                </button>
              </>
            )}
            {(mode === "edit" || mode === "preview") && (
              <button
                type="button"
                onClick={() => setMode("view")}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {mode === "view" ? (
          currentPrompt ? (
            <pre className="max-h-150 overflow-y-auto rounded-lg bg-muted/50 px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">
              {currentPrompt}
            </pre>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No Travers prompt available.
              </p>
            </div>
          )
        ) : mode === "preview" ? (
          <pre className="max-h-150 overflow-y-auto rounded-lg bg-muted/50 px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">
            {previewPrompt}
          </pre>
        ) : (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={28}
            className="min-h-100 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
            placeholder="Paste or type the ACA master prompt here…"
          />
        )}

        {(mode === "edit" || mode === "preview") && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                handleSave(
                  mode === "preview" ? (previewPrompt ?? "") : editValue
                )
              }
              disabled={saving || (!previewPrompt && !editValue.trim())}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-opacity",
                mode === "preview"
                  ? "bg-emerald-600 text-white hover:bg-emerald-600/90"
                  : "bg-foreground text-background hover:opacity-80",
                "disabled:opacity-50"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === "preview"
                    ? "Save Formatted Prompt"
                    : "Save Changes"}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset Travers prompt to default?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the canonical ACA master prompt extracted from
              the DOCX master file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => {
                void handleResetToDefault()
              }}
              className="bg-foreground text-background hover:opacity-85"
            >
              {saving ? "Resetting..." : "Confirm reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
