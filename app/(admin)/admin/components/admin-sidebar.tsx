"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useFormStatus } from "react-dom"
import { useState } from "react"
import type { ComponentType } from "react"
import { AnimatePresence, motion } from "motion/react"
import { VeraLogo } from "@/components/ui/vera-logo"
import {
  Bot,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Sun,
  Users,
} from "lucide-react"
import { useTheme } from "next-themes"
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
import { signOut } from "@/actions/auth-actions"
import { Loader } from "@/components/ai/loader"
import { cn } from "@/lib/utils"
import type { UserData } from "@/types/database"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  exact: boolean
}
type NavGroup = { key: string; label: string | null; items: NavItem[] }

const ADMIN_SECTION_TOGGLE_EASE: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
]

// Flat list kept for collapsed sidebar icon view
const navItems: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  {
    href: "/admin/vera-coach",
    label: "Vera Coach",
    icon: Sparkles,
    exact: false,
  },
  {
    href: "/admin/vera-intelligence",
    label: "Vera Intelligence",
    icon: Bot,
    exact: false,
  },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/agents", label: "Agents", icon: Bot, exact: false },
  { href: "/admin/aca", label: "Agent Creator", icon: Sparkles, exact: false },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    exact: false,
  },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
]

// Grouped nav for expanded sidebar with collapsible sections
const navGroups: NavGroup[] = [
  {
    key: "overview",
    label: null,
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    key: "products",
    label: "Products",
    items: [
      {
        href: "/admin/vera-coach",
        label: "Vera Coach",
        icon: Sparkles,
        exact: false,
      },
      {
        href: "/admin/vera-intelligence",
        label: "Vera Intelligence",
        icon: Bot,
        exact: false,
      },
    ],
  },
  {
    key: "management",
    label: "Management",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, exact: false },
      { href: "/admin/agents", label: "Agents", icon: Bot, exact: false },
      {
        href: "/admin/aca",
        label: "Agent Creator",
        icon: Sparkles,
        exact: false,
      },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      {
        href: "/admin/subscriptions",
        label: "Subscriptions",
        icon: CreditCard,
        exact: false,
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        exact: false,
      },
    ],
  },
]

type Props = {
  user: UserData
  onCollapse: () => void
  onExpand: () => void
  collapsed: boolean
}

function AdminSignOutButton() {
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
      <span>{pending ? "Signing out..." : "Sign out"}</span>
    </button>
  )
}

export function AdminSidebar({ user, onCollapse, onExpand, collapsed }: Props) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g) => [g.key, true]))
  )

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  if (collapsed) {
    return (
      <aside className="flex h-svh w-13 shrink-0 flex-col items-center bg-sidebar">
        <div className="flex w-full flex-col items-center gap-1 px-1.5 pt-2 pb-1">
          <Link href="/" aria-label="Go to Vera AI home">
            <VeraLogo width={20} height={20} variant="short" className="mb-1" />
          </Link>
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
        </div>

        <div className="flex w-full flex-col items-center gap-1 border-t border-border/40 px-1.5 py-2">
          {navItems.map(({ href, label, icon: Icon, exact }) => (
            <Tooltip key={href} delayDuration={600}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                    isActive(href, exact)
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
          <Tooltip delayDuration={600}>
            <TooltipTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full">
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
            </TooltipTrigger>
            <TooltipContent side="right">{user.name}</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-svh w-60 shrink-0 flex-col bg-sidebar">
      {/* Header - logo left, Admin label right */}
      <div className="flex h-14 shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Go to Vera AI home">
            <VeraLogo width={104} height={30} />
          </Link>
          <span className="border-l border-border/60 pl-3 text-xs font-medium tracking-widest text-muted-foreground/60 uppercase">
            Admin
          </span>
        </div>
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

      {/* Nav with collapsible groups */}
      <div className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
        {navGroups.map((group) => {
          if (!group.label) {
            return (
              <div key={group.key} className="mb-1">
                {group.items.map(({ href, label, icon: Icon, exact }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                      isActive(href, exact)
                        ? "bg-foreground/9 text-foreground"
                        : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                ))}
              </div>
            )
          }

          const isOpen = openGroups[group.key] ?? true

          return (
            <div key={group.key} className="mb-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className="group flex w-full items-center justify-between px-3 py-1 text-xs font-semibold text-muted-foreground/60 transition-colors hover:text-foreground/80"
              >
                <span>{group.label}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 0 : -90 }}
                  transition={{
                    duration: 0.2,
                    ease: ADMIN_SECTION_TOGGLE_EASE,
                  }}
                >
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 transition-colors group-hover:text-foreground/75" />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={group.key + "-content"}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="flex flex-col gap-0.5 py-0.5">
                      {group.items.map(({ href, label, icon: Icon, exact }) => (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                            isActive(href, exact)
                              ? "bg-foreground/9 text-foreground"
                              : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* User footer */}
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
                  Admin
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
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
            <DropdownMenuItem
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="gap-2"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0 text-destructive focus:text-destructive">
              <form action={signOut} className="w-full">
                <AdminSignOutButton />
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
