"use client"

import { formatDistanceToNowStrict } from "date-fns"
import {
  ArrowDownUp,
  Brain,
  ChevronDown,
  History,
  Loader2,
  Pencil,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react"
import {
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import {
  createSavedMemoryAction,
  deleteAllSavedMemoriesAction,
  deleteSavedMemoryAction,
  updateMemorySettingsAction,
  updateSavedMemoryAction,
} from "@/actions/memory-actions"
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
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { Switch } from "@/components/animate-ui/components/radix/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  memoryCategorySchema,
  memoryPrioritySchema,
  type MemoryCategory,
} from "@/lib/memory-contract"
import { cn } from "@/lib/utils"
import type {
  MemorySettings as DbMemorySettings,
  SavedMemory as SavedMemoryRow,
} from "@/types/database"

const MEMORY_CATEGORIES = memoryCategorySchema.options
const MEMORY_PRIORITIES = memoryPrioritySchema.options

type MemoryPriority = (typeof MEMORY_PRIORITIES)[number]
type SortOption = "updated-desc" | "updated-asc" | "title-asc" | "priority-desc"

type MemoryDraft = {
  title: string
  content: string
  category: MemoryCategory
  priority: MemoryPriority
}

type MemoryWorkspaceProps = {
  initialMemories: SavedMemoryRow[]
  initialSettings: DbMemorySettings
}

type SelectionOption<T extends string> = {
  value: T
  label: string
}

const EMPTY_DRAFT: MemoryDraft = {
  title: "",
  content: "",
  category: "other",
  priority: "standard",
}

const PRIORITY_ORDER: Record<MemoryPriority, number> = {
  core: 0,
  standard: 1,
  background: 2,
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  identity: "Identity",
  preference: "Preference",
  "communication-style": "Communication",
  "work-context": "Work context",
  "project-context": "Project context",
  "agent-preference": "Agent preference",
  constraint: "Constraint",
  other: "Other",
}

const PRIORITY_LABELS: Record<MemoryPriority, string> = {
  core: "Core",
  standard: "Standard",
  background: "Background",
}

const CATEGORY_OPTIONS: SelectionOption<MemoryCategory>[] =
  MEMORY_CATEGORIES.map((category) => ({
    value: category,
    label: CATEGORY_LABELS[category],
  }))

const PRIORITY_OPTIONS: SelectionOption<MemoryPriority>[] =
  MEMORY_PRIORITIES.map((priority) => ({
    value: priority,
    label: PRIORITY_LABELS[priority],
  }))

const SORT_OPTIONS: SelectionOption<SortOption>[] = [
  {
    value: "updated-desc",
    label: "Recently updated",
  },
  {
    value: "updated-asc",
    label: "Oldest update first",
  },
  {
    value: "title-asc",
    label: "Title A-Z",
  },
  {
    value: "priority-desc",
    label: "Priority first",
  },
]

const SOURCE_LABELS: Record<SavedMemoryRow["source"], string> = {
  "explicit-user": "Captured from chat",
  "assistant-inferred": "Assistant inferred",
  "manual-panel": "Added manually",
}

function filterAndSortMemories(
  memories: SavedMemoryRow[],
  rawQuery: string,
  sortBy: SortOption
): SavedMemoryRow[] {
  const query = rawQuery.trim().toLowerCase()

  const filtered = query
    ? memories.filter((memory) => {
        const haystack = [memory.title, memory.content, memory.category]
          .join(" ")
          .toLowerCase()

        return haystack.includes(query)
      })
    : memories

  return filtered.toSorted((left, right) => {
    switch (sortBy) {
      case "updated-asc":
        return left.updated_at.localeCompare(right.updated_at)
      case "title-asc":
        return left.title.localeCompare(right.title)
      case "priority-desc":
        return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
      case "updated-desc":
      default:
        return right.updated_at.localeCompare(left.updated_at)
    }
  })
}

function SelectionDropdown<T extends string>({
  align = "start",
  className,
  dataTestId,
  disabled,
  icon,
  onChange,
  options,
  value,
}: {
  align?: "start" | "end"
  className?: string
  dataTestId: string
  disabled?: boolean
  icon?: ReactNode
  onChange: (value: T) => void
  options: readonly SelectionOption<T>[]
  value: T
}) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-3 rounded-full border border-border/60 bg-background px-3.5 text-sm text-foreground transition-colors hover:border-foreground/30 hover:bg-accent/40 disabled:opacity-50 data-[state=open]:bg-accent/50",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon ? (
              <span className="shrink-0 text-muted-foreground">{icon}</span>
            ) : null}
            <span className="truncate">{selectedOption?.label ?? value}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-(--radix-dropdown-menu-trigger-width) min-w-52 rounded-2xl p-1.5"
      >
        {options.map((option) => {
          const isSelected = option.value === value

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              data-testid={`${dataTestId}-${option.value}`}
              className={cn(
                "justify-between rounded-xl px-3 py-2 text-sm",
                isSelected && "font-medium text-foreground"
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "text-xs text-muted-foreground transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0"
                )}
              >
                Selected
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SettingRow({
  description,
  disabled,
  icon,
  label,
  onChange,
  testId,
  value,
}: {
  description: string
  disabled?: boolean
  icon: ReactNode
  label: string
  onChange: (value: boolean) => void
  testId: string
  value: boolean
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/12"
      data-testid={`${testId}-row`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-foreground/70">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto">
        <span className="text-xs font-medium text-muted-foreground">
          {value ? "On" : "Off"}
        </span>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label={label}
          data-testid={testId}
          className="h-6 w-10"
        />
      </div>
    </div>
  )
}

function formatTimestamp(timestamp: string): string {
  return formatDistanceToNowStrict(new Date(timestamp), {
    addSuffix: true,
  })
}

export function MemoryWorkspace({
  initialMemories,
  initialSettings,
}: MemoryWorkspaceProps) {
  const [memories, setMemories] = useState(initialMemories)
  const [settings, setSettings] = useState(initialSettings)
  const [draft, setDraft] = useState<MemoryDraft>(EMPTY_DRAFT)
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc")
  const [deleteTarget, setDeleteTarget] = useState<SavedMemoryRow | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const filteredMemories = useMemo(
    () => filterAndSortMemories(memories, deferredSearchQuery, sortBy),
    [deferredSearchQuery, memories, sortBy]
  )

  const isEditing = editingMemoryId !== null

  function resetDraft() {
    setDraft(EMPTY_DRAFT)
    setEditingMemoryId(null)
  }

  function updateDraft<Key extends keyof MemoryDraft>(
    key: Key,
    value: MemoryDraft[Key]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleSettingChange(key: keyof DbMemorySettings, value: boolean) {
    if (settings[key] === value) {
      return
    }

    setPendingAction(`setting:${key}`)
    startTransition(async () => {
      const result = await updateMemorySettingsAction({
        ...settings,
        [key]: value,
      })

      setPendingAction(null)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setSettings(result.settings)
      toast.success("Memory settings saved")
    })
  }

  function handleEdit(memory: SavedMemoryRow) {
    setEditingMemoryId(memory.id)
    setDraft({
      title: memory.title,
      content: memory.content,
      category: memory.category,
      priority: memory.priority,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleSubmit() {
    const payload = {
      title: draft.title,
      content: draft.content,
      category: draft.category,
      priority: draft.priority,
    }

    setPendingAction(isEditing ? `save:${editingMemoryId}` : "create")
    startTransition(async () => {
      const result =
        isEditing && editingMemoryId
          ? await updateSavedMemoryAction({
              memoryId: editingMemoryId,
              ...payload,
            })
          : await createSavedMemoryAction(payload)

      setPendingAction(null)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setMemories((current) => {
        if (isEditing) {
          return current.map((memory) =>
            memory.id === result.memory.id ? result.memory : memory
          )
        }

        return [result.memory, ...current]
      })

      resetDraft()
      toast.success(isEditing ? "Memory updated" : "Memory saved")
    })
  }

  function handleDelete(memory: SavedMemoryRow) {
    setDeleteTarget(memory)
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return
    }

    setPendingAction(`delete:${deleteTarget.id}`)
    startTransition(async () => {
      const target = deleteTarget
      const result = await deleteSavedMemoryAction({ memoryId: target.id })

      setPendingAction(null)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setMemories((current) =>
        current.filter((memory) => memory.id !== target.id)
      )

      if (editingMemoryId === target.id) {
        resetDraft()
      }

      setDeleteTarget(null)
      toast.success("Memory deleted")
    })
  }

  function confirmDeleteAll() {
    setPendingAction("delete-all")
    startTransition(async () => {
      const result = await deleteAllSavedMemoriesAction()

      setPendingAction(null)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setMemories([])
      setDeleteAllOpen(false)
      resetDraft()
      toast.success(
        result.deletedCount > 0
          ? "All saved memories deleted"
          : "No saved memories to delete"
      )
    })
  }

  return (
    <section
      className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_1.25fr]"
      data-testid="memory-workspace"
    >
      <div className="space-y-4">
        <article className="rounded-2xl border border-border/70 bg-card dark:border-white/12">
          <div className="border-b border-border/50 px-6 pt-5 pb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Memory settings
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Choose whether Vera can use saved memories and relevant chat
              history when answering future chats.
            </p>
          </div>

          <div className="space-y-3 px-6 py-5">
            <SettingRow
              description="Allow Vera to use durable saved memories across future chats until you explicitly change or remove them."
              disabled={isPending}
              icon={<Brain className="h-4 w-4" />}
              label="Use saved memories"
              onChange={(value) =>
                handleSettingChange("reference_saved_memories", value)
              }
              testId="memory-setting-saved-memories"
              value={settings.reference_saved_memories}
            />

            <SettingRow
              description="Allow Vera to recover relevant context from previous chats when it improves the current answer without making it permanent memory."
              disabled={isPending}
              icon={<History className="h-4 w-4" />}
              label="Use chat history"
              onChange={(value) =>
                handleSettingChange("reference_chat_history", value)
              }
              testId="memory-setting-chat-history"
              value={settings.reference_chat_history}
            />
          </div>
        </article>

        <article
          className="rounded-2xl border border-border/70 bg-card dark:border-white/12"
          data-testid="memory-form"
        >
          <div className="border-b border-border/50 px-6 pt-5 pb-4">
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {isEditing ? "Editing memory" : "New memory"}
            </p>
            <h2 className="mt-2 text-sm font-semibold text-foreground">
              {isEditing ? "Edit saved memory" : "Add saved memory"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Save the details you want Vera to remember without repeating them
              in every chat.
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                placeholder="Example: Prefer concise bullet summaries"
                maxLength={120}
                data-testid="memory-title-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <SelectionDropdown
                  value={draft.category}
                  onChange={(value) => updateDraft("category", value)}
                  options={CATEGORY_OPTIONS}
                  dataTestId="memory-category-select"
                  className="bg-input/40"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Priority
                </label>
                <SelectionDropdown
                  value={draft.priority}
                  onChange={(value) => updateDraft("priority", value)}
                  options={PRIORITY_OPTIONS}
                  dataTestId="memory-priority-select"
                  className="bg-input/40"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground">
                  Memory text
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {draft.content.length}/1000
                </span>
              </div>
              <textarea
                value={draft.content}
                onChange={(event) =>
                  updateDraft("content", event.target.value.slice(0, 1000))
                }
                placeholder="Example: When I ask for audit summaries, prefer short bullets followed by a short risks list."
                rows={5}
                maxLength={1000}
                className="min-h-32 w-full rounded-3xl border border-transparent bg-input/50 px-4 py-3 text-sm text-foreground transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                data-testid="memory-content-input"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                data-testid="memory-save-button"
              >
                {isPending && pendingAction?.startsWith("save") ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEditing ? "Save changes" : "Save memory"}
              </Button>

              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDraft}
                  disabled={isPending}
                >
                  <X className="h-4 w-4" />
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-border/70 bg-card dark:border-white/12">
        <div className="border-b border-border/50 px-6 pt-5 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Saved memories
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Search, edit, or remove the durable details Vera should carry
                into future chats.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending || memories.length === 0}
                onClick={() => setDeleteAllOpen(true)}
                data-testid="memory-delete-all-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete all
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, text, or category"
                className="pl-9"
                data-testid="memory-search-input"
              />
            </div>

            <SelectionDropdown
              align="end"
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              dataTestId="memory-sort-select"
              className="md:w-56"
              icon={<ArrowDownUp className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              {filteredMemories.length} visible of {memories.length} saved
              {memories.length === 1 ? " memory" : " memories"}
            </p>
            {searchQuery.trim() ? (
              <button
                type="button"
                className="transition-colors hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </button>
            ) : null}
          </div>

          <div className="space-y-3" data-testid="memory-list">
            {filteredMemories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background px-5 py-8 text-center dark:border-white/12">
                <p className="text-sm font-medium text-foreground">
                  {memories.length === 0
                    ? "No saved memories yet"
                    : "No saved memories match your search"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {memories.length === 0
                    ? "Add a durable preference, work context note, or long-lived constraint so Vera can carry it into future chats."
                    : "Try a different search phrase or clear the filter to see the full memory list."}
                </p>
              </div>
            ) : (
              filteredMemories.map((memory) => {
                const isCurrentEdit = editingMemoryId === memory.id

                return (
                  <article
                    key={memory.id}
                    className={cn(
                      "rounded-2xl border border-border/70 bg-background px-5 py-4 transition-colors dark:border-white/12",
                      isCurrentEdit && "border-foreground/20 bg-accent/30"
                    )}
                    data-testid="memory-card"
                    data-memory-id={memory.id}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">
                            {memory.title}
                          </h3>
                          <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {CATEGORY_LABELS[memory.category]}
                          </span>
                          <span className="rounded-full bg-foreground/6 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {PRIORITY_LABELS[memory.priority]}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {memory.content}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{SOURCE_LABELS[memory.source]}</span>
                          <span>
                            Updated {formatTimestamp(memory.updated_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-start">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleEdit(memory)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleDelete(memory)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>
      </article>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent data-testid="memory-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved memory?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove \"${deleteTarget.title}\" from Vera's saved memory bank for future chats.`
                : "This will remove the selected saved memory."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              data-testid="memory-delete-confirm"
            >
              {isPending && pendingAction?.startsWith("delete:") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete memory
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent data-testid="memory-delete-all-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all saved memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every saved memory for your account. It does not
              delete past chats, but Vera will stop using those saved facts in
              future conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={isPending}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              data-testid="memory-delete-all-confirm"
            >
              {isPending && pendingAction === "delete-all" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
