"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AgentIconPicker } from "@/components/agent-icon-picker"
import { AgentKnowledgeBaseManager } from "@/components/agent-knowledge-base-manager"
import { ModelPicker } from "@/components/model-picker"
import { Switch } from "@/components/animate-ui/components/radix/switch"
import Link from "next/link"
import type { Agent } from "@/types/database"

type LayerName = "coach" | "intelligence"

type Props = {
  agent?: Agent
  mode: "create" | "edit"
  initialLayers: readonly LayerName[]
}

type PendingAttachment = {
  id: string
  file: File
}

export function AgentForm({ agent, mode, initialLayers }: Props) {
  const router = useRouter()

  const [name, setName] = useState(agent?.name ?? "")
  const [icon, setIcon] = useState(agent?.icon ?? "Bot")
  const [description, setDescription] = useState(agent?.description ?? "")
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "")
  const [baseModel, setBaseModel] = useState(
    agent?.base_model ?? "claude-sonnet-4-6"
  )
  const [category, setCategory] = useState(agent?.category ?? "")
  const [allowCoach, setAllowCoach] = useState(initialLayers.includes("coach"))
  const [allowIntelligence, setAllowIntelligence] = useState(
    initialLayers.includes("intelligence")
  )
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<
    PendingAttachment[]
  >([])
  const [saving, setSaving] = useState(false)

  const targetAgentId = mode === "edit" ? (agent?.id ?? null) : createdAgentId

  async function uploadPendingFiles(agentId: string): Promise<{
    uploadedCount: number
    failedCount: number
  }> {
    if (pendingAttachments.length === 0) {
      return { uploadedCount: 0, failedCount: 0 }
    }

    const uploads = pendingAttachments.map(async ({ file }) => {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/agents/${agentId}/knowledge-base/upload`, {
        method: "POST",
        body: formData,
      })

      return res.ok
    })

    const results = await Promise.allSettled(uploads)

    let uploadedCount = 0
    let failedCount = 0

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        uploadedCount += 1
      } else {
        failedCount += 1
      }
    }

    return { uploadedCount, failedCount }
  }

  function queueFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const nextFiles = Array.from(files)
    const pdfFiles = nextFiles.filter(
      (file) => file.type === "application/pdf" || file.name.endsWith(".pdf")
    )

    if (pdfFiles.length !== nextFiles.length) {
      toast.error("Only PDF files are supported for knowledge attachments.")
    }

    if (pdfFiles.length === 0) return

    setPendingAttachments((prev) => {
      const existing = new Set(
        prev.map((item) => `${item.file.name}:${item.file.size}`)
      )

      const additions = pdfFiles
        .filter((file) => !existing.has(`${file.name}:${file.size}`))
        .map((file, idx) => ({
          id: `${Date.now()}-${idx}-${file.name}`,
          file,
        }))

      return [...prev, ...additions]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name is required.")
      return
    }
    if (!description.trim()) {
      toast.error("Description is required.")
      return
    }
    if (!category.trim()) {
      toast.error("Category is required.")
      return
    }
    if (!systemPrompt.trim()) {
      toast.error("System prompt is required.")
      return
    }
    if (!allowCoach && !allowIntelligence) {
      toast.error("Select at least one layer for this built-in agent.")
      return
    }

    setSaving(true)

    const layerAccess: LayerName[] = []
    if (allowCoach) layerAccess.push("coach")
    if (allowIntelligence) layerAccess.push("intelligence")

    const body = {
      name: name.trim(),
      icon,
      description: description.trim(),
      system_prompt: systemPrompt.trim(),
      base_model: baseModel,
      category: category.trim(),
      is_builtin: true,
      user_id: null,
      layer_access: layerAccess,
    }

    const isCreateFlow = mode === "create" && !createdAgentId
    const url =
      isCreateFlow || !targetAgentId
        ? "/api/admin/agents"
        : `/api/admin/agents/${targetAgentId}`

    try {
      const res = await fetch(url, {
        method: isCreateFlow || !targetAgentId ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error ?? "Failed to save agent.")
        return
      }

      const payload = (await res.json().catch(() => null)) as {
        id?: string
      } | null

      const resolvedAgentId =
        mode === "create" && !createdAgentId
          ? (payload?.id ?? null)
          : targetAgentId

      if (!resolvedAgentId) {
        toast.error("Agent saved, but no agent id was returned.")
        return
      }

      const { uploadedCount, failedCount } =
        await uploadPendingFiles(resolvedAgentId)

      if (mode === "create" && !createdAgentId) {
        setCreatedAgentId(resolvedAgentId)
      }

      if (uploadedCount > 0) {
        setPendingAttachments([])
      }

      if (failedCount > 0) {
        toast.error(
          `${failedCount} attachment${failedCount === 1 ? "" : "s"} failed to upload.`
        )
      }

      if (uploadedCount > 0) {
        toast.success(
          `Saved agent and attached ${uploadedCount} PDF${uploadedCount === 1 ? "" : "s"}.`
        )
      } else {
        toast.success(mode === "create" ? "Agent created." : "Agent updated.")
      }

      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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
            required
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
          required
        />
      </div>

      {/* System prompt */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">System prompt</label>
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
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
        <p className="text-sm font-medium">Built-in agent</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose exactly which subscribers can use this agent.
        </p>

        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Vera Coach</p>
              <p className="text-xs text-muted-foreground">
                Make this agent available to Coach subscribers.
              </p>
            </div>
            <Switch
              checked={allowCoach}
              onCheckedChange={setAllowCoach}
              aria-label="Allow Vera Coach"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Vera Intelligence</p>
              <p className="text-xs text-muted-foreground">
                Make this agent available to Intelligence subscribers.
              </p>
            </div>
            <Switch
              checked={allowIntelligence}
              onCheckedChange={setAllowIntelligence}
              aria-label="Allow Vera Intelligence"
            />
          </div>
        </div>
      </div>

      <AgentKnowledgeBaseManager
        agentId={targetAgentId}
        title="Built-in Agent Knowledge Files"
        description={
          targetAgentId
            ? "Attach existing PDFs, or upload a new PDF that is automatically linked to this agent."
            : "Add PDFs now. Files are uploaded and linked automatically when you save this agent."
        }
        pendingFiles={
          targetAgentId
            ? []
            : pendingAttachments.map((item) => ({
                id: item.id,
                name: item.file.name,
                sizeBytes: item.file.size,
                mimeType: item.file.type || "application/pdf",
              }))
        }
        onQueueFiles={targetAgentId ? undefined : queueFiles}
        onRemovePendingFile={
          targetAgentId
            ? undefined
            : (id) => {
                setPendingAttachments((prev) =>
                  prev.filter((entry) => entry.id !== id)
                )
              }
        }
        disabled={saving}
      />

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-border/40 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "edit" || createdAgentId ? "Save changes" : "Create agent"}
        </button>
        <Link
          href="/admin/agents"
          className="px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
