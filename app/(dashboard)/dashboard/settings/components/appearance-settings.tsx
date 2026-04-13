"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Palette, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const

type ThemeId = (typeof THEMES)[number]["id"]

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[2]
  const CurrentIcon = current.icon

  return (
    <section className="rounded-xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
      <div className="border-b border-border/50 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/6 text-foreground/70">
            <Palette className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm leading-none font-semibold">Appearance</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose your preferred colour scheme
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Colour scheme</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Controls how the interface looks to you
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-background px-3 text-sm transition-colors hover:bg-foreground/4 focus:outline-none data-[state=open]:bg-foreground/4">
                <CurrentIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{current.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {THEMES.map(({ id, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => setTheme(id)}
                  className={cn("gap-2 text-xs", theme === id && "font-medium")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {theme === id && (
                    <Check className="ml-auto h-3.5 w-3.5 text-foreground/60" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </section>
  )
}
