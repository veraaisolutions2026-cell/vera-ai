import { redirect } from "next/navigation"
import { getMemorySettings, listSavedMemories } from "@/lib/db/memory"
import { MemoryWorkspace } from "@/app/(dashboard)/dashboard/memory/components/memory-workspace"
import { createClient } from "@/lib/supabase/server"

export default async function MemoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [memorySettings, savedMemories] = await Promise.all([
    getMemorySettings(user.id),
    listSavedMemories(user.id, {
      includeArchived: true,
    }),
  ])

  const memoryStatusItems = [
    {
      label: "Saved memories",
      value: `${savedMemories.length}`,
      detail: savedMemories.length === 1 ? "active item" : "active items",
    },
    {
      label: "Use saved memories",
      value: memorySettings.reference_saved_memories ? "On" : "Off",
      detail: "across future chats",
    },
    {
      label: "Use chat history",
      value: memorySettings.reference_chat_history ? "On" : "Off",
      detail: "when context helps",
    },
  ] as const

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 max-w-2xl" data-testid="memory-page">
        <h1 className="text-xl font-semibold tracking-tight">Memory</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Save the preferences and recurring context you want Vera to keep in
          mind across chats.
        </p>
      </div>

      <section
        className="grid gap-3 sm:grid-cols-3"
        data-testid="memory-status-grid"
      >
        {memoryStatusItems.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border/70 bg-card px-4 py-4 dark:border-white/12"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {item.label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-lg font-semibold text-foreground">
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </section>

      <MemoryWorkspace
        initialMemories={savedMemories}
        initialSettings={memorySettings}
      />
    </div>
  )
}
