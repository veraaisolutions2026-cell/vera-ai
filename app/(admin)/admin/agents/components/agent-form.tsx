"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { FileText, Loader2, Upload } from "lucide-react"
import { AgentIconPicker } from "@/components/agent-icon-picker"
import { ModelPicker } from "@/components/model-picker"
import type { Agent } from "@/types/database"

type Props = {
  agent?: Agent
  mode: "create" | "edit"
}

export function AgentForm({ agent, mode }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(agent?.name ?? "")
  const [icon, setIcon] = useState(agent?.icon ?? "Bot")
  const [description, setDescription] = useState(agent?.description ?? "")
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "")
  const [baseModel, setBaseModel] = useState(
    agent?.base_model ?? "claude-sonnet-4-6"
  )
  const [category, setCategory] = useState(agent?.category ?? "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowed.includes(file.type)) {
      setError("Only PDF and DOCX files are supported.")
      return
    }

    setUploading(true)
    setError(null)

    const fd = new FormData()
    fd.append("file", file)

    const res = await fetch("/api/admin/agents/upload", {
      method: "POST",
      body: fd,
    })

    setUploading(false)

    if (!res.ok) {
      setError("Failed to extract text from file.")
      return
    }

    const { text } = (await res.json()) as { text: string }
    setSystemPrompt(text)
    setUploadedFile(file.name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) {
      setError("Name and system prompt are required.")
      return
    }

    setSaving(true)
    setError(null)

    const body = {
      name: name.trim(),
      icon,
      description: description.trim() || null,
      system_prompt: systemPrompt.trim(),
      base_model: baseModel,
      category: category.trim() || null,
      is_builtin: true,
      user_id: null,
    }

    const url =
      mode === "edit" ? `/api/admin/agents/${agent!.id}` : "/api/admin/agents"

    const res = await fetch(url, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setSaving(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? "Failed to save agent.")
      return
    }

    router.push("/admin/agents")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Compliance Auditor"
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
            required
          />
        </div>

        {/* Icon */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Icon</label>
          <div className="flex items-center gap-2">
            <AgentIconPicker value={icon} onChange={setIcon} />
            <span className="text-sm text-muted-foreground">{icon}</span>
          </div>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Base model</label>
          <ModelPicker value={baseModel} onChange={setBaseModel} />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Compliance"
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
          />
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description shown to users"
          className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      {/* System prompt */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">System prompt</label>
          <div className="flex items-center gap-2">
            {uploadedFile && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {uploadedFile}
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {uploading ? "Extracting..." : "Import from PDF / DOCX"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are an expert auditor specialising in..."
          rows={12}
          className="resize-y rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
          required
        />
      </div>

      {/* Built-in behavior */}
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
        <p className="text-sm font-medium">Built-in agent</p>
        <p className="text-xs text-muted-foreground">
          Admin-created agents are always saved as built-in and visible to all
          users.
        </p>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-border/40 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Save changes" : "Create agent"}
        </button>
        <a
          href="/admin/agents"
          className="px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
