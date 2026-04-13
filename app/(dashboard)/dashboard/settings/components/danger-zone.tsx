"use client"

import { useState, useTransition } from "react"
import { Trash2, TriangleAlert, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { deleteAccount } from "@/actions/settings-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/animate-ui/components/radix/alert-dialog"

export function DangerZone() {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount()
      if (result?.error) {
        toast.error(result.error)
        setOpen(false)
      }
      // On success the server action redirects — no need to handle here
    })
  }

  return (
    <section className="rounded-xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
      <div className="border-b border-border/50 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <TriangleAlert className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm leading-none font-semibold text-destructive">
              Danger zone
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Irreversible actions for your account
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Permanently delete your Vera AI account, all your chats, agents,
              and data. This cannot be undone.
            </p>
          </div>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <button className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/8">
                <Trash2 className="h-3.5 w-3.5" />
                Delete account
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account along with all your
                  chats, agents, and data from Vera AI. This action cannot be
                  recovered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  )
}
