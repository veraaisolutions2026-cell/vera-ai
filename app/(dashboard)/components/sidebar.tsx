"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { VeraLogo } from "@/components/ui/vera-logo"
import { useState, useTransition, useRef } from "react"
import { useFormStatus } from "react-dom"
import {
  Bot,
  CreditCard,
  FolderOpen,
  LogOut,
  Moon,
  MoreHorizontal,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SquarePen,
  Sun,
  Trash2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/animate-ui/components/radix/dropdown-menu"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/animate-ui/components/radix/tooltip"
import { signOut } from "@/actions/auth-actions"
import { removeChatAction, renameChat } from "@/actions/chat-actions"
import { Loader } from "@/components/ai/loader"
import { useChatTitleState } from "@/hooks/use-chat-title-state"
import { cn } from "@/lib/utils"
import type { LayerAccess } from "@/lib/db/layer-access"
import type { Chat, UserData } from "@/types/database"

type Props = {
  user: UserData
  chats: Chat[]
  layerAccess: LayerAccess
  onCollapse: () => void
  onExpand: () => void
  collapsed: boolean
}

function getSecondaryNav(layerAccess: LayerAccess) {
  return [
    { href: "/dashboard/chat/manage", label: "Manage Chats", icon: FolderOpen },
    ...(layerAccess.allowBuiltInAgents || layerAccess.allowCustomAgentCrud
      ? [{ href: "/dashboard/agents", label: "Agents", icon: Bot }]
      : []),
    ...(layerAccess.allowKnowledgeBaseManagement
      ? [{ href: "/dashboard/my-files", label: "My Files", icon: FolderOpen }]
      : []),
    { href: "/dashboard/usage", label: "Usage", icon: FolderOpen },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  ]
}

function SignOutMenuButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <Loader size={14} className="text-destructive" />
      ) : (
        <LogOut className="h-4 w-4 text-destructive" />
      )}
      <span>{pending ? "Logging out..." : "Log out"}</span>
    </button>
  )
}

function groupChatsByDate(chats: Chat[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86_400_000)

  const bucket = (c: Chat): string => {
    const d = new Date(c.updated_at)
    if (d >= todayStart) return "Today"
    if (d >= yesterdayStart) return "Yesterday"
    if (d >= weekStart) return "This week"
    return "Older"
  }

  const map = new Map<string, Chat[]>()
  for (const c of chats) {
    const label = bucket(c)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(c)
  }

  const groups: { label: string; items: Chat[] }[] = []
  for (const label of ["Today", "Yesterday", "This week", "Older"]) {
    const items = map.get(label)
    if (items?.length) groups.push({ label, items })
  }
  return groups
}

/* ── Chat item with 3-dot menu ──────────────────────────────── */

function ChatItem({ chat, isActive }: { chat: Chat; isActive: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(chat.title)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const liveTitle = useChatTitleState((state) => state.titles[chat.id])
  const isLiveTitleLoading = useChatTitleState(
    (state) => state.loading[chat.id] ?? false
  )
  const setLiveTitle = useChatTitleState((state) => state.setTitle)
  const clearLiveTitle = useChatTitleState((state) => state.clearTitle)
  const displayTitle = liveTitle ?? chat.title
  const isTitleLoading =
    isLiveTitleLoading || !displayTitle.trim() || displayTitle === "New chat"
  // Set synchronously in startRename so onCloseAutoFocus can read it before state updates
  const pendingRenameRef = useRef(false)

  function startRename() {
    pendingRenameRef.current = true
    setRenameValue(chat.title)
    setIsRenaming(true)
  }

  function commitRename() {
    const trimmed = renameValue.trim()
    setIsRenaming(false)
    if (!trimmed || trimmed === chat.title) return
    startTransition(async () => {
      try {
        await renameChat(chat.id, trimmed)
        setLiveTitle(chat.id, trimmed)
        toast.success("Chat renamed")
      } catch {
        toast.error("Failed to rename chat")
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await removeChatAction(chat.id)
      clearLiveTitle(chat.id)
      toast.success("Chat deleted")
      if (isActive) router.push("/dashboard/chat")
    })
  }

  return (
    <>
      <div
        className={cn(
          "group/chat mx-1 flex items-center rounded-full transition-colors",
          isActive
            ? "bg-foreground/10 text-foreground"
            : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground",
          isRenaming && "bg-foreground/8 text-foreground",
          isPending && "opacity-50"
        )}
      >
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") setIsRenaming(false)
            }}
            className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground/40"
          />
        ) : (
          <Link
            href={`/dashboard/chat/${chat.id}`}
            className="min-w-0 flex-1 px-3 py-1.5 text-sm"
          >
            {isTitleLoading ? (
              <div
                className="h-4 w-32 animate-pulse rounded bg-muted"
                aria-label="Loading chat title"
              />
            ) : (
              <span className="block truncate">{displayTitle}</span>
            )}
          </Link>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/chat:opacity-100 focus:opacity-100 data-[state=open]:opacity-100",
                isRenaming && "pointer-events-none opacity-0"
              )}
              aria-label="Chat options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-36"
            onCloseAutoFocus={(e) => {
              if (!pendingRenameRef.current) return
              // Prevent Radix from focusing the trigger — we want the rename input instead
              e.preventDefault()
              pendingRenameRef.current = false
              requestAnimationFrame(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
              })
            }}
          >
            <DropdownMenuItem onClick={startRename} className="gap-2 text-xs">
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="gap-2 text-xs text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{chat.title}&rdquo; will be permanently deleted and cannot
              be recovered.
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
    </>
  )
}

export function Sidebar({
  user,
  chats,
  layerAccess,
  onCollapse,
  onExpand,
  collapsed,
}: Props) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const groups = groupChatsByDate(chats)
  const secondaryNav = getSecondaryNav(layerAccess)

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  if (collapsed) {
    return (
      <aside className="flex h-svh w-13 shrink-0 flex-col items-center bg-sidebar">
        {/* Top icons */}
        <div className="flex w-full flex-col items-center gap-1 px-1.5 pt-2 pb-1">
          <VeraLogo width={20} height={20} variant="short" className="mb-1" />
          <Tooltip delayDuration={600}>
            <TooltipTrigger asChild>
              <button
                onClick={onExpand}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={600}>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/chat"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <SquarePen className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Secondary nav icons */}
        <div className="flex w-full flex-col items-center gap-1 border-t border-border/40 px-1.5 py-2">
          {secondaryNav.map(({ href, label, icon: Icon }) => (
            <Tooltip key={href} delayDuration={600}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    pathname.startsWith(href)
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* User avatar */}
        <div className="flex w-full flex-col items-center border-t border-border/40 px-1.5 pt-2 pb-2">
          <Tooltip delayDuration={600}>
            <TooltipTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl!}
                    alt={user.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold">
                    {initials}
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{user.name}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-svh w-60 shrink-0 flex-col bg-sidebar">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <VeraLogo width={74} height={20} />
        <div className="flex items-center gap-1">
          <Tooltip delayDuration={600}>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/chat"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <SquarePen className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">New chat</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={600}>
            <TooltipTrigger asChild>
              <button
                onClick={onCollapse}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close sidebar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Chat history */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {groups.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No chats yet. Start a new conversation.
          </p>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label} className="mb-3">
              <p className="mb-1 px-3 py-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                {label}
              </p>
              <div className="flex flex-col gap-1">
                {items.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={pathname === `/dashboard/chat/${chat.id}`}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-border/40 px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-full px-2 py-2 text-left transition-colors hover:bg-foreground/6">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl!}
                  alt={user.name}
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-none font-medium">
                  {user.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2.5">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl!}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
                    {initials}
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {secondaryNav.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} className="rounded-full p-0">
                <Link
                  href={href}
                  className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="gap-2 rounded-full"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-full p-0 text-destructive focus:text-destructive">
              <form action={signOut} className="w-full">
                <SignOutMenuButton />
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
