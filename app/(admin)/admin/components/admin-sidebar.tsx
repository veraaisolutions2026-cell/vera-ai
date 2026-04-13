"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useFormStatus } from "react-dom"
import { VeraLogo } from "@/components/ui/vera-logo"
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
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

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/agents", label: "Agents", icon: Bot, exact: false },
  {
    href: "/admin/aca",
    label: "Agent Creator",
    icon: Sparkles,
    exact: false,
  },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    exact: false,
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
      {/* Header — logo left, Admin label right */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <VeraLogo width={74} height={20} />
          <span className="border-l border-border/60 pl-3 text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">
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

      {/* Nav */}
      <div className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[11px] font-semibold">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-none font-medium">
                  {user.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
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
