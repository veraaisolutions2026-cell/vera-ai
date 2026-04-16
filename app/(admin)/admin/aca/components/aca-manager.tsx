"use client"

import { useRef, useState } from "react"
import { CheckCircle2, FileText, Loader2, Save, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  initialPrompt: string | null
  initialUpdatedAt: string | null
}

type Mode = "view" | "edit" | "preview"

export function AcaManager({ initialPrompt, initialUpdatedAt }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentPrompt, setCurrentPrompt] = useState(initialPrompt ?? "")
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(initialPrompt ?? "")
  const [mode, setMode] = useState<Mode>(initialPrompt ? "view" : "edit")
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)

  const [formatting, setFormatting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowed.includes(file.type)) {
      setError("Only PDF and DOCX files are supported.")
      return
    }

    setFormatting(true)
    setError(null)
    setPreviewPrompt(null)
    setUploadedFile(file.name)

    const fd = new FormData()
    fd.append("file", file)

    const res = await fetch("/api/admin/aca/format", {
      method: "POST",
      body: fd,
    })

    setFormatting(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? "Failed to format file.")
      return
    }

    const { formatted } = (await res.json()) as { formatted: string }
    setPreviewPrompt(formatted)
    setEditValue(formatted)
    setMode("preview")
  }

  async function handleSave(promptToSave: string) {
    if (!promptToSave.trim()) {
      setError("Prompt cannot be empty.")
      return
    }

    setSaving(true)
    setError(null)

    const res = await fetch("/api/admin/aca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptToSave }),
    })

    setSaving(false)

    if (!res.ok) {
      setError("Failed to save.")
      return
    }

    setCurrentPrompt(promptToSave)
    setEditValue(promptToSave)
    setPreviewPrompt(null)
    setUpdatedAt(new Date().toISOString())
    setMode("view")
    showSuccess("Travers prompt saved successfully.")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Status bar */}
      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          Last saved: {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Upload section */}
      <div className="rounded-xl border border-border/60 bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium">Upload Travers Document</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Upload the Travers Master Data File (.docx or .pdf). The AI will
              extract and reformat it into clean structured markdown, preserving
              all §-numbered sections.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={formatting}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {formatting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Formatting…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload & Format
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {uploadedFile && !formatting && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            {uploadedFile}
            {mode === "preview" && (
              <span className="text-emerald-500">
                — formatted preview ready
              </span>
            )}
          </div>
        )}
      </div>

      {/* Prompt editor / viewer */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            {mode === "preview"
              ? "Formatted Preview — review before saving"
              : mode === "edit"
                ? "Edit Travers Prompt"
                : "Current Travers Master Prompt"}
          </h2>
          <div className="flex items-center gap-2">
            {mode === "view" && currentPrompt && (
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
            <pre className="max-h-150 overflow-y-auto rounded-lg bg-muted/50 px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80">
              {currentPrompt}
            </pre>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No Travers prompt configured yet. Upload a file above to get
                started.
              </p>
            </div>
          )
        ) : mode === "preview" ? (
          <pre className="max-h-150 overflow-y-auto rounded-lg bg-muted/50 px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/80">
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
    </div>
  )
}
