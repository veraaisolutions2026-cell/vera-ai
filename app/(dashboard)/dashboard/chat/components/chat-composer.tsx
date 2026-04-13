"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { motion } from "motion/react"
import { ArrowUp, FileText, Paperclip, Square, X } from "lucide-react"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/animate-ui/components/radix/tooltip"
import type { ChatAttachment } from "@/lib/chat-attachments"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types/database"
import { AgentSelector } from "./agent-selector"
import { ModelSelector, type ModelId } from "./model-selector"

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export type AttachedFile = ChatAttachment

type Props = {
  input: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  onStop?: () => void
  agents: Agent[]
  selectedAgent: Agent | null
  onAgentChange: (agent: Agent | null) => void
  model: ModelId
  onModelChange: (model: ModelId) => void
  disabled?: boolean
  attachedFiles?: AttachedFile[]
  onFileAttach?: (file: AttachedFile) => void
  onFileClear?: (index: number) => void
  isUploading?: boolean
}

export function ChatComposer({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  onStop,
  agents,
  selectedAgent,
  onAgentChange,
  model,
  onModelChange,
  disabled,
  attachedFiles = [],
  onFileAttach,
  onFileClear,
  isUploading = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localUploading, setLocalUploading] = useState(false)
  const [uploadingName, setUploadingName] = useState<string | null>(null)
  const [uploadingSize, setUploadingSize] = useState<number | null>(null)

  const effectiveUploading = isUploading || localUploading
  const hasAttachmentStack = effectiveUploading || attachedFiles.length > 0

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return

    element.style.height = "auto"
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [input])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()

      if (
        !isLoading &&
        !effectiveUploading &&
        (input.trim() || attachedFiles.length > 0)
      ) {
        onSubmit()
      }
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File too large. Maximum size is 40 MB.")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    try {
      setLocalUploading(true)
      setUploadingName(file.name)
      setUploadingSize(file.size)

      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        throw new Error(payload?.error ?? `Upload failed (${response.status})`)
      }

      const data = (await response.json()) as AttachedFile
      onFileAttach?.(data)
      toast.success("File attached")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File upload failed")
    } finally {
      setLocalUploading(false)
      setUploadingName(null)
      setUploadingSize(null)
    }
  }

  return (
    <div className="px-4 pt-3 pb-5">
      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/95 shadow-[0_14px_34px_rgba(2,6,23,0.14)] backdrop-blur-xl transition-[border-color,box-shadow] focus-within:border-border focus-within:shadow-[0_20px_44px_rgba(2,6,23,0.2)] dark:shadow-[0_16px_38px_rgba(0,0,0,0.4)] dark:focus-within:shadow-[0_22px_48px_rgba(0,0,0,0.5)]">
          {hasAttachmentStack && (
            <div className="px-3 pt-3 pb-1">
              <div className="flex flex-col gap-2">
                {effectiveUploading && (
                  <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 opacity-60">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/8 text-foreground/70">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/40 border-t-foreground/70" />
                          </span>
                          <p className="truncate text-sm font-medium text-foreground/70">
                            {uploadingName ?? "Uploading..."}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {typeof uploadingSize === "number"
                            ? formatSize(uploadingSize)
                            : "Processing document..."}
                        </p>
                      </div>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/30">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                )}

                {attachedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground/8 text-foreground/70">
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                          <p className="truncate text-sm font-medium text-foreground">
                            {file.name}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {file.type.toUpperCase()} • {formatSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onFileClear?.(index)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
                        aria-label="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-[1.75rem] bg-transparent mask-[linear-gradient(to_bottom,#000_0%,#000_74%,transparent_100%)] px-4 pb-18 text-sm leading-relaxed [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_74%,transparent_100%)] placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50",
              hasAttachmentStack ? "pt-2.5" : "pt-3.5"
            )}
            style={{ minHeight: "52px", maxHeight: "200px" }}
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 bottom-0 h-24 rounded-b-[1.35rem] bg-linear-to-t from-card via-card/90 to-card/0"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 pb-3">
            <div className="flex w-full items-center justify-between rounded-[1.2rem] border border-border/60 bg-background/80 px-1.5 py-1.5 backdrop-blur-md">
              <div className="flex items-center gap-1">
                {onFileAttach && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={
                            disabled ||
                            effectiveUploading ||
                            attachedFiles.length >= 3
                          }
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors",
                            attachedFiles.length < 3 && !effectiveUploading
                              ? "bg-transparent hover:bg-muted hover:text-foreground"
                              : "opacity-40"
                          )}
                          aria-label="Attach file"
                        >
                          {effectiveUploading ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                          ) : (
                            <Paperclip className="h-4 w-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {attachedFiles.length >= 3
                          ? "Max 3 files reached"
                          : "Attach PDF or DOCX (max 40 MB)"}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}

                <AgentSelector
                  agents={agents}
                  selectedAgent={selectedAgent}
                  onSelect={onAgentChange}
                />
                <ModelSelector value={model} onChange={onModelChange} />
              </div>

              {isLoading && onStop ? (
                <motion.button
                  type="button"
                  onClick={onStop}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-80"
                  aria-label="Stop"
                  animate={{
                    scale: [1, 1.08, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(255,255,255,0.28)",
                      "0 0 0 6px rgba(255,255,255,0.06)",
                      "0 0 0 0 rgba(255,255,255,0.28)",
                    ],
                  }}
                  transition={{
                    duration: 1.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Square className="h-3.5 w-3.5 fill-background" />
                </motion.button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={
                    (!input.trim() && attachedFiles.length === 0) ||
                    disabled ||
                    effectiveUploading ||
                    (isLoading && !onStop)
                  }
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                    input.trim() && !isLoading && !effectiveUploading
                      ? "bg-foreground text-background hover:opacity-80"
                      : isLoading
                        ? "bg-foreground text-background opacity-80"
                        : "bg-foreground/10 text-muted-foreground"
                  )}
                  aria-label={isLoading ? "Loading..." : "Send"}
                >
                  {isLoading && !onStop ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
