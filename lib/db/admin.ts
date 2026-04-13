import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Agent, Profile } from "@/types/database"

const BILLING_PRICE_USD = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 49, annual: 39 },
  enterprise: { monthly: 149, annual: 119 },
} as const

const CHURNED_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid"])

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function toLabel(date: Date, withYear = false): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: withYear ? undefined : "numeric",
    year: withYear ? "numeric" : undefined,
  })
}

function toMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
  })
}

function getMonthlyEquivalent(plan: string, interval: string | null): number {
  if (plan !== "pro" && plan !== "enterprise") {
    return 0
  }

  return interval === "annual"
    ? BILLING_PRICE_USD[plan].annual
    : BILLING_PRICE_USD[plan].monthly
}

export type UserRow = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "role" | "created_at"
> & { email: string | null }

export type AdminStats = {
  totalUsers: number
  totalAgents: number
  totalChats: number
  totalSubscriptions: number
}

export type OverviewChartPoint = {
  date: string
  users: number
  chats: number
  subscriptions: number
  estimatedMrr: number
}

export type SubscriptionPlanPoint = {
  plan: string
  count: number
  fill: string
}

export type SubscriptionTrendPoint = {
  month: string
  starts: number
  churned: number
  net: number
}

export type SubscriptionInsights = {
  activeCount: number
  trialingCount: number
  cancelAtPeriodEnd: number
  estimatedMrr: number
  planBreakdown: SubscriptionPlanPoint[]
  monthlyTrend: SubscriptionTrendPoint[]
}

export async function getAllUsers(): Promise<UserRow[]> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("profiles")
    .select("id, full_name, avatar_url, role, created_at")
    .order("created_at", { ascending: false })

  if (error || !data) return []

  const authUsers: Array<{ id: string; email: string | null }> = []
  let page = 1
  let hasNext = true

  while (hasNext) {
    const { data: pageData, error: pageError } =
      await service.auth.admin.listUsers({ page, perPage: 200 })

    if (pageError || !pageData?.users) break

    authUsers.push(
      ...pageData.users.map((u) => ({ id: u.id, email: u.email ?? null }))
    )
    hasNext = pageData.users.length === 200
    page += 1
  }

  const emailMap: Record<string, string> = {}
  authUsers.forEach((u) => {
    emailMap[u.id] = u.email ?? ""
  })

  return data.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    role: p.role as Profile["role"],
    created_at: p.created_at,
    email: emailMap[p.id] ?? null,
  }))
}

export async function getAllAgents(): Promise<Agent[]> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("agents")
    .select("*")
    .eq("is_builtin", true)
    .order("is_builtin", { ascending: false })
    .order("name")

  if (error || !data) return []
  return data as Agent[]
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient()

  const [usersResult, agentsResult, chatsResult, subsResult] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("agents").select("id", { count: "exact", head: true }),
      supabase.from("chats").select("id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ])

  return {
    totalUsers: usersResult.count ?? 0,
    totalAgents: agentsResult.count ?? 0,
    totalChats: chatsResult.count ?? 0,
    totalSubscriptions: subsResult.count ?? 0,
  }
}

export async function getOverviewChartData(
  days = 7
): Promise<OverviewChartPoint[]> {
  const supabase = await createClient()
  const startDate = startOfDay(new Date())
  startDate.setDate(startDate.getDate() - (days - 1))

  const [usersResult, chatsResult, subsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", startDate.toISOString()),
    supabase
      .from("chats")
      .select("created_at")
      .gte("created_at", startDate.toISOString()),
    supabase
      .from("subscriptions")
      .select("created_at, plan, status, billing_interval")
      .gte("created_at", startDate.toISOString()),
  ])

  const buckets: Record<string, OverviewChartPoint> = {}
  for (let i = 0; i < days; i += 1) {
    const current = new Date(startDate)
    current.setDate(startDate.getDate() + i)
    const key = dayKey(current)
    buckets[key] = {
      date: toLabel(current),
      users: 0,
      chats: 0,
      subscriptions: 0,
      estimatedMrr: 0,
    }
  }

  usersResult.data?.forEach((row) => {
    if (!row.created_at) return
    const key = dayKey(new Date(row.created_at))
    if (buckets[key]) buckets[key].users += 1
  })

  chatsResult.data?.forEach((row) => {
    if (!row.created_at) return
    const key = dayKey(new Date(row.created_at))
    if (buckets[key]) buckets[key].chats += 1
  })

  subsResult.data?.forEach((row) => {
    if (!row.created_at) return
    const key = dayKey(new Date(row.created_at))
    if (!buckets[key]) return

    buckets[key].subscriptions += 1
    if (row.status === "active" || row.status === "trialing") {
      buckets[key].estimatedMrr += getMonthlyEquivalent(
        row.plan,
        row.billing_interval
      )
    }
  })

  return Object.values(buckets)
}

export async function getSubscriptionInsights(
  months = 6
): Promise<SubscriptionInsights> {
  const supabase = await createClient()
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const firstMonth = new Date(currentMonth)
  firstMonth.setMonth(firstMonth.getMonth() - (months - 1))

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, billing_interval, created_at, updated_at, cancel_at_period_end"
    )

  const monthlyMap: Record<string, SubscriptionTrendPoint> = {}
  for (let i = 0; i < months; i += 1) {
    const bucketDate = new Date(firstMonth)
    bucketDate.setMonth(firstMonth.getMonth() + i)
    const key = monthKey(bucketDate)
    monthlyMap[key] = {
      month: toMonthLabel(bucketDate),
      starts: 0,
      churned: 0,
      net: 0,
    }
  }

  let activeCount = 0
  let trialingCount = 0
  let cancelAtPeriodEnd = 0
  let estimatedMrr = 0

  const planCounts: Record<string, number> = {
    free: 0,
    pro: 0,
    enterprise: 0,
  }

  subscriptions?.forEach((sub) => {
    if (sub.status === "active") {
      activeCount += 1
      estimatedMrr += getMonthlyEquivalent(sub.plan, sub.billing_interval)
      if (sub.plan in planCounts) planCounts[sub.plan] += 1
    }

    if (sub.status === "trialing") {
      trialingCount += 1
      estimatedMrr += getMonthlyEquivalent(sub.plan, sub.billing_interval)
      if (sub.plan in planCounts) planCounts[sub.plan] += 1
    }

    if (sub.cancel_at_period_end) {
      cancelAtPeriodEnd += 1
    }

    if (sub.created_at) {
      const created = new Date(sub.created_at)
      const key = monthKey(created)
      if (monthlyMap[key]) {
        monthlyMap[key].starts += 1
      }
    }

    if (sub.updated_at && CHURNED_STATUSES.has(sub.status)) {
      const changed = new Date(sub.updated_at)
      const key = monthKey(changed)
      if (monthlyMap[key]) {
        monthlyMap[key].churned += 1
      }
    }
  })

  const monthlyTrend = Object.values(monthlyMap).map((point) => ({
    ...point,
    net: point.starts - point.churned,
  }))

  const planBreakdown: SubscriptionPlanPoint[] = [
    { plan: "Pro", count: planCounts.pro, fill: "var(--chart-1)" },
    {
      plan: "Enterprise",
      count: planCounts.enterprise,
      fill: "var(--chart-2)",
    },
    { plan: "Free", count: planCounts.free, fill: "oklch(0.68 0.01 285)" },
  ]

  return {
    activeCount,
    trialingCount,
    cancelAtPeriodEnd,
    estimatedMrr,
    planBreakdown,
    monthlyTrend,
  }
}

export async function adminCreateAgent(
  agent: Omit<Agent, "id" | "created_at" | "updated_at">
): Promise<Agent | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("agents")
    .insert({
      ...agent,
      is_builtin: true,
      user_id: null,
    })
    .select()
    .single()

  if (error) return null
  return data as Agent
}

export async function adminUpdateAgent(
  id: string,
  updates: Partial<Omit<Agent, "id" | "created_at" | "updated_at">>
): Promise<Agent | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from("agents")
    .update({
      ...updates,
      is_builtin: true,
      user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) return null
  return data as Agent
}

export async function adminDeleteAgent(id: string): Promise<boolean> {
  const service = createServiceClient()
  const { error } = await service.from("agents").delete().eq("id", id)
  return !error
}

export async function adminUpdateUserRole(
  userId: string,
  role: Profile["role"]
): Promise<boolean> {
  const service = createServiceClient()
  const { error } = await service
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
  return !error
}

export async function adminDeleteUser(userId: string): Promise<boolean> {
  const service = createServiceClient()
  const { error: authError } = await service.auth.admin.deleteUser(userId)
  if (authError) return false

  await service.from("profiles").delete().eq("id", userId)
  return true
}
