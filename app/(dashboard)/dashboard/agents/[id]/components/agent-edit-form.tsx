"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bot, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader } from "@/components/ai/loader"
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
import { updateUserAgent, deleteUserAgent } from "@/actions/agent-actions"
import { AgentIconPicker } from "@/components/agent-icon-picker"
import { ModelPicker } from "@/components/model-picker"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types/database"

export function AgentEditForm({ agent }: { agent: Agent }) {
  const router = useRouter()

  const [name, setName] = useState(agent.name)
  const [icon, setIcon] = useState(agent.icon)
  const [description, setDescription] = useState(agent.description ?? "")
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt)
  const [baseModel, setBaseModel] = useState(agent.base_model)
  const [category, setCategory] = useState(agent.category ?? "")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isRouteLoading, setIsRouteLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !systemPrompt.trim()) {
      setFormError("Name and system prompt are required.")
      return
    }

    setSaving(true)
    setFormError(null)

    const result = await updateUserAgent(agent.id, {
      name: name.trim(),
      icon,
      description: description.trim() || null,
      system_prompt: systemPrompt.trim(),
      base_model: baseModel,
      category: category.trim() || null,
    })

    setSaving(false)

    if (result && "error" in result) {
      setFormError(result.error)
      return
    }

    toast.success("Agent saved.")
    setIsRouteLoading(true)
    router.push("/dashboard/agents")
    router.refresh()
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUserAgent(agent.id)
      if (result && "error" in result) {
        toast.error(result.error)
      } else {
        toast.success("Agent deleted.")
        setIsRouteLoading(true)
        router.push("/dashboard/agents")
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-border/50 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/agents"
              className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm leading-none font-semibold">Edit Agent</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {agent.name}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 sm:flex-none"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              type="submit"
              form="agent-edit-form"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-40 sm:flex-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <form
            id="agent-edit-form"
            onSubmit={handleSave}
            className="mx-auto flex w-full max-w-2xl flex-col gap-5"
          >
            {formError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
                {formError}
              </p>
            )}

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
                required
              />
            </div>

            {/* Icon */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Icon
              </label>
              <div className="flex items-center gap-2">
                <AgentIconPicker value={icon} onChange={setIcon} />
                <span className="text-xs text-muted-foreground">{icon}</span>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description shown in agent selector"
                className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
              />
            </div>

            {/* Model + Category */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Model
                </label>
                <ModelPicker value={baseModel} onChange={setBaseModel} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Audit, Tax, Compliance"
                  className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
                />
              </div>
            </div>

            {/* System Prompt */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                System Prompt <span className="text-destructive">*</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={20}
                className="resize-y rounded-lg border border-border/60 bg-background px-3 py-2.5 font-mono text-xs leading-relaxed transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
                required
              />
            </div>
          </form>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{agent.name}&rdquo; will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isRouteLoading && (
        <div className="pointer-events-none fixed inset-0 z-9999 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Loader size={28} className="text-foreground/70" />
        </div>
      )}
    </>
  )
}
