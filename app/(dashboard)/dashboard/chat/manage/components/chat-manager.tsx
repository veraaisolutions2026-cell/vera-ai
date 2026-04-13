"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Trash2, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
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
import { Checkbox } from "@/components/animate-ui/components/radix/checkbox"
import { cn } from "@/lib/utils"
import { removeMultipleChatsAction } from "@/actions/chat-actions"
import type { Chat } from "@/types/database"

export function ChatManager({ chats }: { chats: Chat[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  const allSelected = chats.length > 0 && selected.size === chats.length
  const noneSelected = selected.size === 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(chats.map((c) => c.id)))
    }
  }

  function toggleOne(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDelete() {
    const ids = Array.from(selected)
    startTransition(async () => {
      await removeMultipleChatsAction(ids)
      toast.success(`${ids.length} chat${ids.length > 1 ? "s" : ""} deleted`)
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Checkbox
            checked={
              allSelected ? true : selected.size > 0 ? "indeterminate" : false
            }
            onCheckedChange={toggleAll}
          />
          <span className="text-xs font-medium">
            {selected.size > 0
              ? `${selected.size} of ${chats.length} selected`
              : "Select all"}
          </span>
        </label>

        <AnimatePresence>
          {!noneSelected && (
            <motion.button
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.14 }}
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selected.size}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      {chats.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No chats yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/50">
          {chats.map((chat, i) => {
            const isSelected = selected.has(chat.id)
            return (
              <div
                key={chat.id}
                onClick={() => {
                  setNavigatingTo(chat.id)
                  router.push(`/dashboard/chat/${chat.id}`)
                }}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors",
                  i > 0 && "border-t border-border/40",
                  isSelected ? "bg-foreground/5" : "hover:bg-foreground/[0.035]"
                )}
              >
                {/* Checkbox — hidden until hover or selected */}
                <div
                  className={cn(
                    "shrink-0 transition-opacity duration-150",
                    isSelected
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev)
                        next.has(chat.id)
                          ? next.delete(chat.id)
                          : next.add(chat.id)
                        return next
                      })
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Icon */}
                <MessageSquare
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-150",
                    isSelected
                      ? "text-foreground/40"
                      : "text-muted-foreground/40 group-hover:text-muted-foreground/60"
                  )}
                />

                {/* Title + timestamp */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-snug font-medium">
                    {chat.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/50">
                    {formatDistanceToNow(new Date(chat.updated_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {/* Arrow / spinner hint */}
                {navigatingTo === chat.id ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground/50" />
                ) : (
                  <span
                    className={cn(
                      "shrink-0 text-xs text-muted-foreground/30 transition-opacity duration-150",
                      "opacity-0 group-hover:opacity-100"
                    )}
                  >
                    →
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} chat{selected.size > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected conversation
              {selected.size > 1 ? "s" : ""} and all messages. This cannot be
              undone.
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
    </div>
  )
}
