import { createServiceClient } from "@/lib/supabase/service"

export type AdminAgentTab = {
  id: string
  name: string
  createdAt: string
}

export type AdminAgentTabState = {
  tabs: AdminAgentTab[]
  assignments: Record<string, string[]>
}

const ADMIN_AGENT_TABS_KEY = "admin_agent_tabs_v1"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeTab(raw: unknown): AdminAgentTab | null {
  if (!isRecord(raw)) return null

  const id = typeof raw.id === "string" ? raw.id : ""
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.length > 0
      ? raw.createdAt
      : new Date().toISOString()

  if (!id || !name) return null

  return { id, name, createdAt }
}

function normalizeAssignments(
  raw: unknown,
  validTabIds: Set<string>
): Record<string, string[]> {
  if (!isRecord(raw)) return {}

  const assignments: Record<string, string[]> = {}

  for (const [agentId, tabIds] of Object.entries(raw)) {
    if (!agentId || !Array.isArray(tabIds)) continue

    const cleaned = Array.from(
      new Set(
        tabIds.filter(
          (tabId): tabId is string =>
            typeof tabId === "string" && validTabIds.has(tabId)
        )
      )
    )

    if (cleaned.length > 0) {
      assignments[agentId] = cleaned
    }
  }

  return assignments
}

function normalizeState(raw: unknown): AdminAgentTabState {
  if (!isRecord(raw)) {
    return { tabs: [], assignments: {} }
  }

  const tabs = Array.isArray(raw.tabs)
    ? raw.tabs
        .map((tab) => normalizeTab(tab))
        .filter((tab): tab is AdminAgentTab => tab !== null)
    : []

  const validTabIds = new Set(tabs.map((tab) => tab.id))
  const assignments = normalizeAssignments(raw.assignments, validTabIds)

  return { tabs, assignments }
}

async function readState(): Promise<AdminAgentTabState> {
  const service = createServiceClient()
  const { data } = await service
    .from("system_config")
    .select("value")
    .eq("key", ADMIN_AGENT_TABS_KEY)
    .maybeSingle<{ value: string }>()

  if (!data?.value) {
    return { tabs: [], assignments: {} }
  }

  try {
    return normalizeState(JSON.parse(data.value) as unknown)
  } catch {
    return { tabs: [], assignments: {} }
  }
}

async function writeState(state: AdminAgentTabState): Promise<void> {
  const service = createServiceClient()

  await service.from("system_config").upsert(
    {
      key: ADMIN_AGENT_TABS_KEY,
      value: JSON.stringify(state),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )
}

function slugifyTabName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "tab"
}

function buildTabId(name: string, existingIds: Set<string>): string {
  const base = slugifyTabName(name)

  if (!existingIds.has(base)) return base

  let suffix = 2
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1
  }

  return `${base}-${suffix}`
}

export async function getAdminAgentTabsState(): Promise<AdminAgentTabState> {
  return readState()
}

export async function createAdminAgentTab(
  name: string
): Promise<AdminAgentTab> {
  const cleanedName = name.trim()
  if (!cleanedName) {
    throw new Error("Tab name is required")
  }

  const state = await readState()
  const nameExists = state.tabs.some(
    (tab) => tab.name.toLowerCase() === cleanedName.toLowerCase()
  )

  if (nameExists) {
    throw new Error("A tab with this name already exists")
  }

  const id = buildTabId(cleanedName, new Set(state.tabs.map((tab) => tab.id)))
  const tab: AdminAgentTab = {
    id,
    name: cleanedName,
    createdAt: new Date().toISOString(),
  }

  await writeState({
    tabs: [...state.tabs, tab],
    assignments: state.assignments,
  })

  return tab
}

export async function deleteAdminAgentTab(tabId: string): Promise<void> {
  const state = await readState()
  const remainingTabs = state.tabs.filter((tab) => tab.id !== tabId)

  if (remainingTabs.length === state.tabs.length) {
    return
  }

  const nextAssignments: Record<string, string[]> = {}

  for (const [agentId, tabIds] of Object.entries(state.assignments)) {
    const nextTabIds = tabIds.filter((id) => id !== tabId)
    if (nextTabIds.length > 0) {
      nextAssignments[agentId] = nextTabIds
    }
  }

  await writeState({
    tabs: remainingTabs,
    assignments: nextAssignments,
  })
}

export async function setAgentTabsForMany(
  agentIds: string[],
  tabIds: string[]
): Promise<void> {
  const state = await readState()
  const validTabIds = new Set(state.tabs.map((tab) => tab.id))

  const cleanedAgentIds = Array.from(
    new Set(
      agentIds.filter((agentId) => typeof agentId === "string" && agentId)
    )
  )
  const cleanedTabIds = Array.from(
    new Set(
      tabIds.filter(
        (tabId) => typeof tabId === "string" && validTabIds.has(tabId)
      )
    )
  )

  const nextAssignments = { ...state.assignments }

  for (const agentId of cleanedAgentIds) {
    if (cleanedTabIds.length === 0) {
      delete nextAssignments[agentId]
    } else {
      nextAssignments[agentId] = cleanedTabIds
    }
  }

  await writeState({
    tabs: state.tabs,
    assignments: nextAssignments,
  })
}
