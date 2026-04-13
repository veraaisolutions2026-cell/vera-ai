"use client"

import { memo, type ComponentProps, type ReactNode } from "react"
import { motion } from "motion/react"
import {
  type LucideIcon,
  Check,
  Circle,
  File,
  Loader2,
  XCircle,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

/* ── Types ──────────────────────────────────────────────────────── */

export type TaskStatus = "pending" | "in_progress" | "completed" | "error"

type StatusConfig = {
  icon: LucideIcon
  iconClass: string
  labelClass: string
}

const STATUS_CONFIG: Record<TaskStatus, StatusConfig> = {
  pending: {
    icon: Circle,
    iconClass: "text-muted-foreground/30",
    labelClass: "text-muted-foreground/50",
  },
  in_progress: {
    icon: Loader2,
    iconClass: "text-foreground/50 animate-spin",
    labelClass: "text-foreground",
  },
  completed: {
    icon: Check,
    iconClass: "text-emerald-500 dark:text-emerald-400",
    labelClass: "text-foreground/60",
  },
  error: {
    icon: XCircle,
    iconClass: "text-destructive",
    labelClass: "text-destructive",
  },
}

/* ── Task (root) ────────────────────────────────────────────────── */

export type TaskProps = ComponentProps<typeof Collapsible>

export const Task = memo(function Task({
  className,
  children,
  ...props
}: TaskProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <Collapsible
        className={cn(
          "rounded-xl border border-border/50 bg-card text-card-foreground",
          className
        )}
        {...props}
      >
        {children}
      </Collapsible>
    </motion.div>
  )
})

/* ── TaskTrigger ────────────────────────────────────────────────── */

export type TaskTriggerProps = Omit<
  ComponentProps<typeof CollapsibleTrigger>,
  "children"
> & {
  title: ReactNode
  badge?: ReactNode
}

export const TaskTrigger = memo(function TaskTrigger({
  title,
  badge,
  className,
  ...props
}: TaskTriggerProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "group flex w-full items-center gap-3 px-4 py-3",
        "text-left text-sm font-medium text-foreground/70 transition-colors",
        "hover:text-foreground focus-visible:outline-none",
        "data-[state=open]:border-b data-[state=open]:border-border/40",
        "data-[state=open]:bg-foreground/2",
        className
      )}
      {...props}
    >
      <span className="flex-1 truncate">{title}</span>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </CollapsibleTrigger>
  )
})

/* ── TaskContent ────────────────────────────────────────────────── */

export const TaskContent = memo(function TaskContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <CollapsibleContent>
      <motion.div
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={cn("divide-y divide-border/20 px-4 pt-1 pb-3", className)}
          {...props}
        >
          {children}
        </div>
      </motion.div>
    </CollapsibleContent>
  )
})

/* ── TaskItem ────────────────────────────────────────────────────── */

export type TaskItemProps = ComponentProps<"div"> & {
  label: ReactNode
  description?: ReactNode
  status?: TaskStatus
}

export const TaskItem = memo(function TaskItem({
  className,
  label,
  description,
  status = "pending",
  ...props
}: TaskItemProps) {
  const { icon: Icon, iconClass, labelClass } = STATUS_CONFIG[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn("flex items-start gap-3 py-2.5", className)}
        {...props}
      >
        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Icon className={cn("h-3.5 w-3.5", iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={cn("text-sm", labelClass)}>{label}</span>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
})

/* ── TaskItemFile ────────────────────────────────────────────────── */

export type TaskItemFileProps = ComponentProps<"div"> & {
  filename: string
  status?: TaskStatus
}

export const TaskItemFile = memo(function TaskItemFile({
  className,
  filename,
  status = "pending",
  ...props
}: TaskItemFileProps) {
  const { icon: Icon, iconClass } = STATUS_CONFIG[status]

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5",
        className
      )}
      {...props}
    >
      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      <span className="flex-1 truncate font-mono text-xs text-foreground/70">
        {filename}
      </span>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClass)} />
    </div>
  )
})
