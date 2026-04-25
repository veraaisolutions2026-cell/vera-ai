"use client"

import { useTransition, useState } from "react"
import { Loader2, Trash2, Unlink } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
import {
  deleteKnowledgeBaseFileAction,
  unlinkKnowledgeBaseFileFromAgentAction,
} from "@/actions/admin-kb-actions"

/* ─── Unlink button ─────────────────────────────────────────────── */

export function UnlinkButton({
  agentId,
  fileId,
  agentName,
}: {
  agentId: string
  fileId: string
  agentName: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleUnlink() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("fileId", fileId)
      fd.set("agentId", agentId)
      try {
        await unlinkKnowledgeBaseFileFromAgentAction(fd)
        toast.success(`Unlinked from ${agentName}.`)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to unlink agent."
        )
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleUnlink}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-xs text-destructive underline-offset-2 transition-opacity hover:underline disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Unlink className="h-3 w-3" />
      )}
      {isPending ? "Unlinking…" : "Unlink"}
    </button>
  )
}

/* ─── Delete file button with confirm dialog ────────────────────── */

export function DeleteFileButton({
  fileId,
  fileName,
}: {
  fileId: string
  fileName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("fileId", fileId)
      try {
        await deleteKnowledgeBaseFileAction(fd)
        setOpen(false)
        toast.success(`"${fileName}" deleted.`)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete file."
        )
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete file
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{fileName}&rdquo; will be permanently deleted from storage
              and all agent links will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-60"
            >
              {isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
