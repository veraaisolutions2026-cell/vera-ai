import { createServiceClient } from "@/lib/supabase/service"

const ADMIN_UNLIMITED_MODE_KEY = "admin_unlimited_mode_v1"

type AdminUnlimitedModeConfig = {
  enabledUserIds: string[]
}

function normalizeConfig(raw: unknown): AdminUnlimitedModeConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { enabledUserIds: [] }
  }

  const ids = (raw as { enabledUserIds?: unknown }).enabledUserIds
  if (!Array.isArray(ids)) {
    return { enabledUserIds: [] }
  }

  return {
    enabledUserIds: ids.filter((id): id is string => typeof id === "string"),
  }
}

async function getConfig(): Promise<AdminUnlimitedModeConfig> {
  const service = createServiceClient()
  const { data } = await service
    .from("system_config")
    .select("value")
    .eq("key", ADMIN_UNLIMITED_MODE_KEY)
    .maybeSingle<{ value: string }>()

  if (!data?.value) {
    return { enabledUserIds: [] }
  }

  try {
    return normalizeConfig(JSON.parse(data.value))
  } catch {
    return { enabledUserIds: [] }
  }
}

async function isAdminRole(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string }>()

  return data?.role === "admin"
}

export async function isAdminUnlimitedModeEnabled(
  userId: string
): Promise<boolean> {
  const [isAdmin, config] = await Promise.all([
    isAdminRole(userId),
    getConfig(),
  ])

  return isAdmin && config.enabledUserIds.includes(userId)
}

export async function setAdminUnlimitedMode(
  userId: string,
  enabled: boolean
): Promise<void> {
  const config = await getConfig()
  const nextIds = new Set(config.enabledUserIds)

  if (enabled) {
    nextIds.add(userId)
  } else {
    nextIds.delete(userId)
  }

  const payload: AdminUnlimitedModeConfig = {
    enabledUserIds: Array.from(nextIds),
  }

  const service = createServiceClient()
  await service.from("system_config").upsert(
    {
      key: ADMIN_UNLIMITED_MODE_KEY,
      value: JSON.stringify(payload),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  )
}
