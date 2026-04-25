"use client"

import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function KnowledgeBaseUploadCard() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState("")

  async function uploadFile(file: File) {
    const formData = new FormData()
    formData.append("file", file)

    setIsUploading(true)
    const res = await fetch("/api/admin/knowledge-base/upload", {
      method: "POST",
      body: formData,
    })
    setIsUploading(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(payload?.error ?? "Upload failed.")
      return
    }

    toast.success(`Uploaded ${file.name} (${formatBytes(file.size)})`)
    setSelectedFileName("")
    router.refresh()
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""

    if (!file) {
      return
    }

    setSelectedFileName(file.name)
    await uploadFile(file)
  }

  function openPicker() {
    if (isUploading) return

    fileInputRef.current?.click()
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">
        Files are stored in the private knowledge-base-files bucket.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          disabled={isUploading}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isUploading ? "Uploading..." : "Upload PDF"}
        </button>

        <span className="text-xs text-muted-foreground">
          {selectedFileName || "No file selected"}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFilePicked}
        className="hidden"
      />
    </div>
  )
}
