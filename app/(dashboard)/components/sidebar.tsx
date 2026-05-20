"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { useFormStatus } from "react-dom"
import {
  BarChart3,
  Brain,
  Bot,
  ChevronDown,
  CreditCard,
  FileText,
  FolderOpen,
  LogOut,
  MessageSquare,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Pin,
  PinOff,
  Search,
  Settings,
  SquarePen,
  Sun,
  Trash2,
  X,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { signOut } from "@/actions/auth-actions"
import { removeChatAction, renameChat } from "@/actions/chat-actions"
import { updateFavoriteAgents } from "@/actions/sidebar-actions"
import { AgentIcon } from "@/components/agent-icon-picker"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/animate-ui/components/radix/tooltip"
import { Input } from "@/components/ui/input"
import { VeraLogo } from "@/components/ui/vera-logo"
import { useChatTitleState } from "@/hooks/use-chat-title-state"
import type { LayerAccess } from "@/lib/db/layer-access"
import { MEMORY_ROUTE_MAP } from "@/lib/memory-contract"
import { cn } from "@/lib/utils"
import type { Agent, Chat, UserData } from "@/types/database"

const MAX_VISIBLE_FAVORITE_AGENTS = 4
const SIDEBAR_SECTION_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
]

type Props = {
  user: UserData
  chats: Chat[]
  agents: Agent[]
  favoriteAgentIds: string[]
  layerAccess: LayerAccess
  onCollapse: () => void
  onExpand: () => void
  onNavigate: () => void
  collapsed: boolean
}

type SidebarSectionKey = "favorites" | "recents"

const DEFAULT_SECTION_STATE: Record<SidebarSectionKey, boolean> = {
  favorites: false,
  recents: false,
}

const SIDEBAR_SECTION_STATE_STORAGE_KEY = "vera:dashboard-sidebar-sections:v1"
const SIDEBAR_TOP_ACTION_BASE_CLASS =
  "flex w-full items-center gap-3 rounded-[1.15rem] px-3 py-1.5 text-sm font-medium transition-colors"
const SIDEBAR_TOP_ACTION_INACTIVE_CLASS =
  "text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
const SIDEBAR_TOP_ACTION_ACTIVE_CLASS = "bg-foreground text-background"

function parseSidebarSectionState(value: string | null) {
  if (!value) {
    return { ...DEFAULT_SECTION_STATE }
  }

  try {
    const parsed = JSON.parse(value) as Partial<
      Record<SidebarSectionKey, unknown>
    >

    return {
      favorites: parsed.favorites === true,
      recents: parsed.recents === true,
    }
  } catch {
    return { ...DEFAULT_SECTION_STATE }
  }
}

function getWorkspaceNav(layerAccess: LayerAccess) {
  return [
    { href: "/dashboard/chat/manage", label: "Manage Chats", icon: FolderOpen },
    { href: MEMORY_ROUTE_MAP.dashboard, label: "Memory", icon: Brain },
    ...(layerAccess.allowBuiltInAgents || layerAccess.allowCustomAgentCrud
      ? [{ href: "/dashboard/agents", label: "Agents", icon: Bot }]
      : []),
    ...(layerAccess.allowKnowledgeBaseManagement
      ? [{ href: "/dashboard/my-files", label: "My Files", icon: FileText }]
      : []),
  ]
}

function getAccountNav() {
  return [
    { href: "/dashboard/usage", label: "Usage", icon: BarChart3 },
    { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ]
}

function getChatGroups(chats: Chat[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86_400_000)

  const bucket = (chat: Chat) => {
    const updatedAt = new Date(chat.updated_at)
    if (updatedAt >= todayStart) return "Today"
    if (updatedAt >= yesterdayStart) return "Yesterday"
    if (updatedAt >= weekStart) return "This week"
    return "Older"
  }

  const grouped = new Map<string, Chat[]>()

  for (const chat of chats) {
    const label = bucket(chat)
    if (!grouped.has(label)) {
      grouped.set(label, [])
    }

    grouped.get(label)?.push(chat)
  }

  return ["Today", "Yesterday", "This week", "Older"]
    .map((label) => ({ label, items: grouped.get(label) ?? [] }))
    .filter((group) => group.items.length > 0)
}

function getSearchChatGroups(chats: Chat[]) {
  const now = new Date()
  const sevenDaysStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 7
  )
  const thirtyDaysStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 30
  )

  const bucket = (chat: Chat) => {
    const updatedAt = new Date(chat.updated_at)
    if (updatedAt >= sevenDaysStart) return "Previous 7 Days"
    if (updatedAt >= thirtyDaysStart) return "Previous 30 Days"
    return "Older"
  }

  const grouped = new Map<string, Chat[]>()

  for (const chat of chats) {
    const label = bucket(chat)
    if (!grouped.has(label)) {
      grouped.set(label, [])
    }

    grouped.get(label)?.push(chat)
  }

  return ["Previous 7 Days", "Previous 30 Days", "Older"]
    .map((label) => ({ label, items: grouped.get(label) ?? [] }))
    .filter((group) => group.items.length > 0)
}

function formatSearchDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value))
}

function getAgentChatHref(agentId: string) {
  return `/dashboard/chat?agent=${agentId}&fromAgentCard=1`
}

function SignOutMenuButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"
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

function SidebarSectionButton({
  label,
  isOpen,
  count,
  onToggle,
  reducedMotion,
}: {
  label: string
  isOpen: boolean
  count?: number
  onToggle: () => void
  reducedMotion: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full items-center justify-between px-3 py-1 text-xs font-semibold text-muted-foreground/85 transition-colors hover:text-foreground/85"
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {typeof count === "number" ? (
          <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-xs leading-none text-muted-foreground/85 transition-colors group-hover:text-foreground/85">
            {count}
          </span>
        ) : null}
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 0 : -90 }}
        transition={{
          duration: reducedMotion ? 0 : 0.2,
          ease: SIDEBAR_SECTION_EASE,
        }}
      >
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/85 transition-colors group-hover:text-foreground/85" />
      </motion.div>
    </button>
  )
}

function SidebarSearchDialog({
  open,
  onOpenChange,
  chats,
  onNavigate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chats: Chat[]
  onNavigate: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()

  useEffect(() => {
    if (open) return
    setQuery("")
  }, [open])

  const filteredChats = useMemo(() => {
    if (!normalizedQuery) return chats

    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(normalizedQuery)
    )
  }, [chats, normalizedQuery])

  const groupedChats = useMemo(
    () => getSearchChatGroups(filteredChats),
    [filteredChats]
  )

  const showNewChat =
    !normalizedQuery ||
    "new chat".includes(normalizedQuery) ||
    normalizedQuery.includes("new")

  function navigateTo(href: string) {
    onOpenChange(false)
    onNavigate()
    router.push(href)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        overlayClassName="backdrop-blur-sm"
        className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[1.9rem] border-border/60 bg-card/95 p-0 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:max-w-3xl"
      >
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>Search chats</AlertDialogTitle>
          <AlertDialogDescription>
            Search recent chats or start a new conversation.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="border-b border-border/55 px-5 py-4">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats..."
              className="h-10 border-none bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[min(34rem,70vh)] overflow-y-auto px-4 pt-1 pb-3">
          <div className="space-y-3">
            {showNewChat ? (
              <button
                type="button"
                onClick={() => navigateTo("/dashboard/chat")}
                className="flex w-full items-center gap-3 rounded-[1.2rem] px-3 py-2.5 text-left text-sm transition-colors hover:bg-foreground/6"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground/80">
                  <SquarePen className="h-4 w-4" />
                </span>
                <span className="font-medium text-foreground">New chat</span>
              </button>
            ) : null}

            {groupedChats.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-border/60 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  No chats found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a different title or start a new conversation.
                </p>
              </div>
            ) : (
              groupedChats.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((chat) => (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => navigateTo(`/dashboard/chat/${chat.id}`)}
                        className="flex w-full items-center gap-3 rounded-[1.1rem] px-3 py-2.5 text-left transition-colors hover:bg-foreground/6"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {chat.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Updated {formatSearchDate(chat.updated_at)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function SidebarUserMenuContent({
  user,
  initials,
  accountNav,
  resolvedTheme,
  setTheme,
  onNavigate,
  side,
}: {
  user: UserData
  initials: string
  accountNav: Array<{
    href: string
    label: string
    icon: typeof Settings
  }>
  resolvedTheme: string | undefined
  setTheme: (theme: string) => void
  onNavigate: () => void
  side: "top" | "right"
}) {
  return (
    <DropdownMenuContent side={side} align="start" className="w-56">
      <DropdownMenuLabel className="font-normal">
        <div className="flex items-center gap-2.5">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
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
      {accountNav.map(({ href, label, icon: Icon }) => (
        <DropdownMenuItem key={href} className="rounded-full p-0">
          <Link
            href={href}
            onClick={onNavigate}
            className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
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
  )
}

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

      if (isActive) {
        router.push("/dashboard/chat")
      }
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
            onChange={(event) => setRenameValue(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename()
              if (event.key === "Escape") setIsRenaming(false)
            }}
            className="min-w-0 flex-1 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground/40"
          />
        ) : (
          <Link
            href={`/dashboard/chat/${chat.id}`}
            className="min-w-0 flex-1 px-3 py-1 text-sm"
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
              type="button"
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
            onCloseAutoFocus={(event) => {
              if (!pendingRenameRef.current) return

              event.preventDefault()
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
  agents,
  favoriteAgentIds,
  layerAccess,
  onCollapse,
  onExpand,
  onNavigate,
  collapsed,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion() ?? false
  const { resolvedTheme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [agentsMenuOpen, setAgentsMenuOpen] = useState(false)
  const [recentsMenuOpen, setRecentsMenuOpen] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState(favoriteAgentIds)
  const recentsScrollRef = useRef<HTMLDivElement>(null)
  const [sectionState, setSectionState] = useState<
    Record<SidebarSectionKey, boolean>
  >(() => ({ ...DEFAULT_SECTION_STATE }))
  const [isSectionStateReady, setIsSectionStateReady] = useState(false)
  const [recentsFadeState, setRecentsFadeState] = useState({
    showTop: false,
    showBottom: false,
  })
  const [isSavingFavorites, startSavingFavorites] = useTransition()

  const workspaceNav = getWorkspaceNav(layerAccess)
  const accountNav = getAccountNav()
  const chatGroups = useMemo(() => getChatGroups(chats), [chats])
  const agentsById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents]
  )
  const favoriteAgentIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
  const favoriteAgents = useMemo(
    () =>
      favoriteIds
        .map((agentId) => agentsById.get(agentId))
        .filter((agent): agent is Agent => Boolean(agent)),
    [agentsById, favoriteIds]
  )
  const visibleFavoriteAgents = favoriteAgents.slice(
    0,
    MAX_VISIBLE_FAVORITE_AGENTS
  )
  const orderedAgents = useMemo(() => {
    const favoriteOrder = new Map(
      favoriteIds.map((agentId, index) => [agentId, index])
    )

    return [...agents].sort((left, right) => {
      const leftIndex = favoriteOrder.get(left.id)
      const rightIndex = favoriteOrder.get(right.id)

      if (typeof leftIndex === "number" && typeof rightIndex === "number") {
        return leftIndex - rightIndex
      }

      if (typeof leftIndex === "number") return -1
      if (typeof rightIndex === "number") return 1

      return left.name.localeCompare(right.name)
    })
  }, [agents, favoriteIds])

  const initials = user.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  useEffect(() => {
    setFavoriteIds(favoriteAgentIds)
  }, [favoriteAgentIds])

  useEffect(() => {
    if (typeof window === "undefined") return

    setSectionState(
      parseSidebarSectionState(
        window.localStorage.getItem(SIDEBAR_SECTION_STATE_STORAGE_KEY)
      )
    )
    setIsSectionStateReady(true)
  }, [])

  useEffect(() => {
    if (!isSectionStateReady || typeof window === "undefined") return

    window.localStorage.setItem(
      SIDEBAR_SECTION_STATE_STORAGE_KEY,
      JSON.stringify(sectionState)
    )
  }, [isSectionStateReady, sectionState])

  const syncRecentsFadeState = useCallback(() => {
    const element = recentsScrollRef.current
    if (!element) return

    const nextState = {
      showTop: element.scrollTop > 4,
      showBottom:
        element.scrollTop + element.clientHeight < element.scrollHeight - 4,
    }

    setRecentsFadeState((current) => {
      if (
        current.showTop === nextState.showTop &&
        current.showBottom === nextState.showBottom
      ) {
        return current
      }

      return nextState
    })
  }, [])

  useEffect(() => {
    if (!sectionState.recents) return

    const frame = window.requestAnimationFrame(syncRecentsFadeState)
    window.addEventListener("resize", syncRecentsFadeState)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", syncRecentsFadeState)
    }
  }, [chatGroups.length, sectionState.recents, syncRecentsFadeState])

  function toggleSection(section: SidebarSectionKey) {
    setSectionState((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  function persistFavoriteIds(
    nextFavoriteIds: string[],
    previousIds: string[],
    agentId: string,
    wasFavorite: boolean
  ) {
    startSavingFavorites(async () => {
      const result = await updateFavoriteAgents(nextFavoriteIds)

      if (result?.error) {
        setFavoriteIds(previousIds)
        toast.error("Could not save favorite agents")
        return
      }

      setFavoriteIds(result.favoriteAgentIds)
      const agentName = agentsById.get(agentId)?.name ?? "Agent"
      toast.success(
        wasFavorite
          ? `${agentName} removed from favourites`
          : `${agentName} pinned to favourites`
      )
    })
  }

  function handleToggleFavorite(agentId: string) {
    const previousIds = favoriteIds
    const wasFavorite = favoriteAgentIdSet.has(agentId)
    const nextFavoriteIds = wasFavorite
      ? previousIds.filter((currentId) => currentId !== agentId)
      : [agentId, ...previousIds.filter((currentId) => currentId !== agentId)]

    setFavoriteIds(nextFavoriteIds)
    persistFavoriteIds(nextFavoriteIds, previousIds, agentId, wasFavorite)
  }

  function handleOpenAgentChat(agentId: string) {
    setAgentsMenuOpen(false)
    onNavigate()
    router.push(getAgentChatHref(agentId))
  }

  const searchDialog = (
    <SidebarSearchDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      chats={chats}
      onNavigate={onNavigate}
    />
  )

  if (collapsed) {
    return (
      <>
        {searchDialog}

        <aside className="flex h-svh w-13 shrink-0 flex-col items-center bg-sidebar">
          <div className="flex w-full flex-col items-center gap-1 px-1.5 pt-2 pb-1">
            <Link href="/" aria-label="Go to Vera AI home">
              <VeraLogo
                width={20}
                height={20}
                variant="short"
                className="mb-1"
              />
            </Link>

            <Tooltip delayDuration={600}>
              <TooltipTrigger asChild>
                <button
                  type="button"
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
                  onClick={onNavigate}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <SquarePen className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">New chat</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={600}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Search className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Search chats</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={600}>
              <DropdownMenu
                open={recentsMenuOpen}
                onOpenChange={setRecentsMenuOpen}
              >
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Recents</TooltipContent>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="w-72 rounded-[1.2rem] p-1.5"
                >
                  <div className="px-2 pt-1 pb-1.5">
                    <p className="text-xs font-medium text-muted-foreground/85">
                      Recents
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto pr-1">
                    {chatGroups.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        No chats yet.
                      </p>
                    ) : (
                      chatGroups.map((group) => (
                        <div key={group.label} className="mb-3 last:mb-0">
                          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground/85">
                            {group.label}
                          </p>
                          <div className="space-y-1">
                            {group.items.map((chat) => (
                              <DropdownMenuItem
                                key={chat.id}
                                className="rounded-[0.95rem] p-0"
                              >
                                <Link
                                  href={`/dashboard/chat/${chat.id}`}
                                  onClick={onNavigate}
                                  className="block w-full truncate px-2.5 py-1.5 text-sm"
                                >
                                  {chat.title}
                                </Link>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </Tooltip>

            {workspaceNav.map(({ href, label, icon: Icon }) => (
              <Tooltip key={href} delayDuration={600}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    onClick={onNavigate}
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

          <div className="flex-1" />

          <div className="flex w-full flex-col items-center border-t border-border/40 px-1.5 pt-2 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  aria-label="Open account menu"
                >
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
                      {initials}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <SidebarUserMenuContent
                user={user}
                initials={initials}
                accountNav={accountNav}
                resolvedTheme={resolvedTheme}
                setTheme={setTheme}
                onNavigate={onNavigate}
                side="right"
              />
            </DropdownMenu>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      {searchDialog}

      <aside className="flex h-svh w-60 shrink-0 flex-col bg-sidebar">
        <div className="shrink-0">
          <div className="flex h-14 items-center justify-between px-1">
            <Link href="/" aria-label="Go to Vera AI home">
              <VeraLogo width={104} height={30} />
            </Link>

            <Tooltip delayDuration={600}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onCollapse}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close sidebar</TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-1.5 px-2 pb-3">
            <Link
              href="/dashboard/chat"
              onClick={onNavigate}
              className={cn(
                SIDEBAR_TOP_ACTION_BASE_CLASS,
                pathname === "/dashboard/chat"
                  ? SIDEBAR_TOP_ACTION_ACTIVE_CLASS
                  : SIDEBAR_TOP_ACTION_INACTIVE_CLASS
              )}
            >
              <SquarePen className="h-4 w-4" />
              <span>New chat</span>
            </Link>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                SIDEBAR_TOP_ACTION_BASE_CLASS,
                "text-left",
                SIDEBAR_TOP_ACTION_INACTIVE_CLASS
              )}
            >
              <Search className="h-4 w-4" />
              <span>Search chats</span>
            </button>

            <div className="space-y-1">
              {workspaceNav.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    SIDEBAR_TOP_ACTION_BASE_CLASS,
                    pathname.startsWith(href)
                      ? SIDEBAR_TOP_ACTION_ACTIVE_CLASS
                      : SIDEBAR_TOP_ACTION_INACTIVE_CLASS
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="shrink-0">
              <SidebarSectionButton
                label="Favourite Agents"
                isOpen={sectionState.favorites}
                count={favoriteAgents.length}
                onToggle={() => toggleSection("favorites")}
                reducedMotion={prefersReducedMotion}
              />

              <AnimatePresence initial={false}>
                {sectionState.favorites ? (
                  <motion.div
                    key="favorite-agents"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.22,
                      ease: SIDEBAR_SECTION_EASE,
                    }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 max-h-[28svh] space-y-1 overflow-y-auto pr-1">
                      {visibleFavoriteAgents.length > 0 ? (
                        visibleFavoriteAgents.map((agent) => (
                          <div
                            key={agent.id}
                            className="group/agent flex items-center gap-2 rounded-[1rem] px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
                          >
                            <Link
                              href={getAgentChatHref(agent.id)}
                              onClick={onNavigate}
                              className="flex min-w-0 flex-1 items-center gap-2.5"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-foreground/80">
                                <AgentIcon
                                  name={agent.icon}
                                  className="h-4 w-4"
                                />
                              </span>
                              <span className="truncate font-medium">
                                {agent.name}
                              </span>
                            </Link>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                handleToggleFavorite(agent.id)
                              }}
                              disabled={isSavingFavorites}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-[opacity,color,background-color] group-hover/agent:opacity-100 hover:bg-foreground/8 hover:text-foreground focus:opacity-100 disabled:opacity-40"
                              aria-label={`Unpin ${agent.name}`}
                            >
                              <PinOff className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : agents.length > 0 ? (
                        <div className="rounded-[1rem] border border-dashed border-border/60 px-3 py-4 text-center">
                          <p className="text-xs font-medium text-foreground">
                            No pinned agents yet
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Pin the agents you use most so they stay here.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-[1rem] border border-dashed border-border/60 px-3 py-4 text-center">
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            No agents available for this account yet.
                          </p>
                        </div>
                      )}

                      {agents.length > 0 ? (
                        <DropdownMenu
                          open={agentsMenuOpen}
                          onOpenChange={setAgentsMenuOpen}
                        >
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-[1rem] px-3 py-1.5 text-sm text-muted-foreground/85 transition-colors hover:bg-foreground/6 hover:text-foreground"
                            >
                              <span>
                                {favoriteAgents.length >
                                MAX_VISIBLE_FAVORITE_AGENTS
                                  ? `More (${favoriteAgents.length - MAX_VISIBLE_FAVORITE_AGENTS})`
                                  : "More"}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            side="bottom"
                            className="w-[18rem] rounded-[1.2rem] p-1.5"
                          >
                            <div className="px-2 pt-1 pb-1.5">
                              <p className="text-xs font-medium text-muted-foreground/85">
                                All agents
                              </p>
                            </div>
                            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                              {orderedAgents.map((agent) => {
                                const isPinned = favoriteAgentIdSet.has(
                                  agent.id
                                )

                                return (
                                  <div
                                    key={agent.id}
                                    className="group/agent-row flex items-center gap-2 rounded-[0.95rem] px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-foreground/6 hover:text-foreground"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenAgentChat(agent.id)
                                      }
                                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                                    >
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-foreground/80">
                                        <AgentIcon
                                          name={agent.icon}
                                          className="h-4 w-4"
                                        />
                                      </span>
                                      <span className="truncate font-medium">
                                        {agent.name}
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        handleToggleFavorite(agent.id)
                                      }}
                                      disabled={isSavingFavorites}
                                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-[opacity,color,background-color] group-hover/agent-row:opacity-100 hover:bg-foreground/8 hover:text-foreground focus:opacity-100 disabled:opacity-40"
                                      aria-label={
                                        isPinned
                                          ? `Unpin ${agent.name}`
                                          : `Pin ${agent.name}`
                                      }
                                    >
                                      {isPinned ? (
                                        <PinOff className="h-3.5 w-3.5" />
                                      ) : (
                                        <Pin className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="min-h-0 flex-1">
              <SidebarSectionButton
                label="Recents"
                isOpen={sectionState.recents}
                count={chats.length}
                onToggle={() => toggleSection("recents")}
                reducedMotion={prefersReducedMotion}
              />

              <AnimatePresence initial={false}>
                {sectionState.recents ? (
                  <motion.div
                    key="recent-chats"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "100%", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.22,
                      ease: SIDEBAR_SECTION_EASE,
                    }}
                    className="min-h-0 overflow-hidden"
                  >
                    <div className="relative mt-1 h-full min-h-0">
                      {recentsFadeState.showTop ? (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-sidebar via-sidebar/90 to-transparent"
                        />
                      ) : null}
                      {recentsFadeState.showBottom ? (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-sidebar via-sidebar/95 via-45% to-transparent"
                        />
                      ) : null}

                      <div
                        ref={recentsScrollRef}
                        onScroll={syncRecentsFadeState}
                        className="h-full overflow-y-auto pt-2 pr-1 pb-16"
                      >
                        {chatGroups.length === 0 ? (
                          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                            No chats yet. Start a new conversation.
                          </p>
                        ) : (
                          chatGroups.map((group) => (
                            <div key={group.label} className="mb-3">
                              <p className="mb-1 px-3 py-0.5 text-xs font-semibold text-muted-foreground/85">
                                {group.label}
                              </p>
                              <div className="flex flex-col gap-1">
                                {group.items.map((chat) => (
                                  <ChatItem
                                    key={chat.id}
                                    chat={chat}
                                    isActive={
                                      pathname === `/dashboard/chat/${chat.id}`
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/40 px-2 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-full px-2 py-2 text-left transition-colors hover:bg-foreground/6">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-none font-medium">
                    {user.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <SidebarUserMenuContent
              user={user}
              initials={initials}
              accountNav={accountNav}
              resolvedTheme={resolvedTheme}
              setTheme={setTheme}
              onNavigate={onNavigate}
              side="top"
            />
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
