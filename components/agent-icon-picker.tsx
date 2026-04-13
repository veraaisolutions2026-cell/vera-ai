"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Bot,
  Scale,
  BarChart2,
  FileText,
  PenLine,
  DollarSign,
  Shield,
  Lock,
  Building2,
  ClipboardList,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  Calculator,
  Users,
  Briefcase,
  Globe,
  Layers,
  MessageSquare,
  Lightbulb,
  Database,
  Code2,
  CheckSquare,
  type LucideIcon,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { AGENT_ICONS, AGENT_ICON_NAMES } from "@/lib/agent-icons"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (name: string) => void
}

export function AgentIconPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return q
      ? AGENT_ICON_NAMES.filter((n) => n.toLowerCase().includes(q))
      : AGENT_ICON_NAMES
  }, [query])

  const SelectedIcon = AGENT_ICONS[value] ?? Bot

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:bg-muted"
          aria-label="Pick icon"
        >
          <SelectedIcon className="h-5 w-5 text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="relative mb-2">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="h-8 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          />
        </div>
        <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">
          {filtered.map((name) => {
            const Icon = AGENT_ICONS[name]!
            const isActive = value === name
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                  setQuery("")
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No icons match &ldquo;{query}&rdquo;
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

const EMOJI_ICON_MAP: Record<string, LucideIcon> = {
  "🔍": Search,
  "⚖️": Scale,
  "📊": BarChart2,
  "📄": FileText,
  "✍️": PenLine,
  "💰": DollarSign,
  "🤖": Bot,
  "🛡️": Shield,
  "🔒": Lock,
  "🏛️": Building2,
  "📋": ClipboardList,
  "📈": TrendingUp,
  "📚": BookOpen,
  "⚠️": AlertTriangle,
  "🧮": Calculator,
  "👥": Users,
  "💼": Briefcase,
  "🌍": Globe,
  "🗂️": Layers,
  "💬": MessageSquare,
  "💡": Lightbulb,
  "🗄️": Database,
  "💻": Code2,
  "✅": CheckSquare,
}

export function AgentIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = AGENT_ICONS[name] ?? EMOJI_ICON_MAP[name] ?? Bot
  return <Icon className={className} />
}
