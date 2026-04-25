"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  FileText,
  Link2,
  Loader2,
  Unlink,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { cn } from "@/lib/utils"

type AvailableFile = {
  id: string
  name: string
  sizeBytes: number
  mimeType: string
  scope: "admin" | "user"
  createdAt: string
}

type LinkedFile = {
  fileId: string
  name: string
  sizeBytes: number
  mimeType: string
  linkedAt: string
}

type KnowledgeBasePayload = {
  availableFiles: AvailableFile[]
  linkedFiles: LinkedFile[]
}

type PendingFileItem = {
  id: string
  name: string
  sizeBytes: number
  mimeType: string
}

type Props = {
  agentId: string | null
  title?: string
  description?: string
  pendingFiles?: PendingFileItem[]
  onQueueFiles?: (files: FileList | null) => void
  onRemovePendingFile?: (id: string) => void
  disabled?: boolean
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function AgentKnowledgeBaseManager({
  agentId,
  title = "Knowledge Base Files",
  description = "Attach existing PDFs, or upload a new PDF that is automatically linked to this agent.",
  pendingFiles = [],
  onQueueFiles,
  onRemovePendingFile,
  disabled = false,
}: Props) {
  const [availableFiles, setAvailableFiles] = useState<AvailableFile[]>([])
  const [linkedFiles, setLinkedFiles] = useState<LinkedFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [unlinkingFileId, setUnlinkingFileId] = useState<string | null>(null)

  const linkedIds = useMemo(
    () => new Set(linkedFiles.map((file) => file.fileId)),
    [linkedFiles]
  )

  const attachableFiles = useMemo(
    () => availableFiles.filter((file) => !linkedIds.has(file.id)),
    [availableFiles, linkedIds]
  )

  const selectedAttachableFile = useMemo(
    () => attachableFiles.find((file) => file.id === selectedFileId) ?? null,
    [attachableFiles, selectedFileId]
  )

  const loadData = useCallback(async () => {
    if (!agentId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-base`, {
        cache: "no-store",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error ?? "Failed to load knowledge files")
      }

      const payload = (await response.json()) as KnowledgeBasePayload
      setAvailableFiles(payload.availableFiles)
      setLinkedFiles(payload.linkedFiles)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load knowledge files"
      )
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function attachSelectedFile() {
    if (!agentId || !selectedFileId) return

    setIsLinking(true)
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-base`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: selectedFileId }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error ?? "Failed to link file")
      }

      setSelectedFileId("")
      await loadData()
      toast.success("File linked to agent")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link file"
      )
    } finally {
      setIsLinking(false)
    }
  }

  async function unlinkFile(fileId: string) {
    if (!agentId) return

    setUnlinkingFileId(fileId)
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-base`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error ?? "Failed to unlink file")
      }

      await loadData()
      toast.success("File unlinked")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unlink file"
      )
    } finally {
      setUnlinkingFileId(null)
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!agentId) return

    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    setIsUploading(true)
    try {
      const response = await fetch(
        `/api/agents/${agentId}/knowledge-base/upload`,
        {
          method: "POST",
          body: formData,
        }
      )

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(payload?.error ?? "Failed to upload file")
      }

      await loadData()
      toast.success("PDF uploaded and linked to this agent")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload file"
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-3">
        {agentId ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={
                    disabled ||
                    isLoading ||
                    isUploading ||
                    isLinking ||
                    attachableFiles.length === 0
                  }
                  className="inline-flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                >
                  <span className="truncate text-left">
                    {selectedAttachableFile
                      ? `${selectedAttachableFile.name} (${formatBytes(selectedAttachableFile.sizeBytes)})`
                      : attachableFiles.length > 0
                        ? "Select existing PDF"
                        : "No unlinked PDFs available"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="max-h-72 w-(--radix-popover-trigger-width) overflow-y-auto p-1"
              >
                {attachableFiles.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    All available PDFs are already linked.
                  </p>
                ) : (
                  attachableFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        setSelectedFileId(file.id)
                        setIsDropdownOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {file.name} ({formatBytes(file.sizeBytes)})
                      </span>
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground",
                          selectedFileId === file.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </button>
                  ))
                )}
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={attachSelectedFile}
              disabled={
                disabled ||
                !selectedFileId ||
                isLoading ||
                isUploading ||
                isLinking
              }
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isLinking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
              Attach
            </button>
          </div>
        ) : null}

        <label
          className={cn(
            "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-medium transition-colors hover:bg-accent",
            (disabled || isUploading || isLoading) &&
              "cursor-not-allowed opacity-50"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {agentId ? "Upload and attach PDF" : "Add PDFs"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            multiple={!agentId}
            onChange={(event) => {
              if (!agentId) {
                onQueueFiles?.(event.target.files)
                event.target.value = ""
                return
              }

              void handleUpload(event)
            }}
            disabled={disabled || isUploading || isLoading}
            className="hidden"
          />
        </label>

        {!agentId && pendingFiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No pending files yet. Save the agent to upload and link selected
            PDFs.
          </p>
        ) : null}

        {!agentId && pendingFiles.length > 0 ? (
          <div className="rounded-md border border-border/50 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              Pending files ({pendingFiles.length})
            </p>
            <div className="space-y-2">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <FileText className="mr-1 inline h-3 w-3" />
                      {formatBytes(file.sizeBytes)} | {file.mimeType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePendingFile?.(file.id)}
                    disabled={disabled}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {agentId ? (
          <div className="rounded-md border border-border/50 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              Linked files ({linkedFiles.length})
            </p>

            {linkedFiles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No linked files yet.
              </p>
            ) : (
              <div className="space-y-2">
                {linkedFiles.map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/50 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <FileText className="mr-1 inline h-3 w-3" />
                        {formatBytes(file.sizeBytes)} | {file.mimeType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void unlinkFile(file.fileId)}
                      disabled={
                        disabled || unlinkingFileId === file.fileId || isLoading
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {unlinkingFileId === file.fileId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Unlink className="h-3 w-3" />
                      )}
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
