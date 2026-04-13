import { createClient } from "@/lib/supabase/server"

const PLAN_PRICE_USD = {
  free: { monthly: 0, annual: 0 },
  pro: { monthly: 49, annual: 39 },
  enterprise: { monthly: 149, annual: 119 },
} as const

type Plan = "free" | "pro" | "enterprise"

type ActivityPoint = {
  date: string
  chats: number
  messages: number
}

type SpendPoint = {
  date: string
  spend: number
  messages: number
}

export type UsageAnalytics = {
  totalChats: number
  totalMessages: number
  monthMessages: number
  activeDaysLast14: number
  plan: Plan
  status: string
  estimatedMonthlySpend: number
  activity: ActivityPoint[]
  spend: SpendPoint[]
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function monthlyPrice(plan: Plan, interval: string | null): number {
  if (plan === "free") return 0
  return interval === "annual"
    ? PLAN_PRICE_USD[plan].annual
    : PLAN_PRICE_USD[plan].monthly
}

export async function getUsageAnalytics(
  userId: string
): Promise<UsageAnalytics> {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start14 = new Date(today)
  start14.setDate(start14.getDate() - 13)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [
    totalChatsResult,
    totalMessagesResult,
    monthMessagesResult,
    recentChatsResult,
    recentMessagesResult,
    subscriptionResult,
  ] = await Promise.all([
    supabase
      .from("chats")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("chats")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", start14.toISOString()),
    supabase
      .from("messages")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", start14.toISOString()),
    supabase
      .from("subscriptions")
      .select("plan, status, billing_interval")
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  const buckets: Record<string, ActivityPoint> = {}
  for (let i = 0; i < 14; i += 1) {
    const current = new Date(start14)
    current.setDate(start14.getDate() + i)
    const key = dayKey(current)
    buckets[key] = {
      date: dayLabel(current),
      chats: 0,
      messages: 0,
    }
  }

  recentChatsResult.data?.forEach((row) => {
    const createdAt = row.created_at
    if (!createdAt) return
    const key = dayKey(new Date(createdAt))
    if (buckets[key]) buckets[key].chats += 1
  })

  recentMessagesResult.data?.forEach((row) => {
    const createdAt = row.created_at
    if (!createdAt) return
    const key = dayKey(new Date(createdAt))
    if (buckets[key]) buckets[key].messages += 1
  })

  const activity = Object.values(buckets)
  const activeDaysLast14 = activity.filter(
    (point) => point.chats > 0 || point.messages > 0
  ).length

  const plan =
    subscriptionResult.data?.plan === "pro" ||
    subscriptionResult.data?.plan === "enterprise"
      ? subscriptionResult.data.plan
      : "free"

  const estimatedMonthlySpend = monthlyPrice(
    plan,
    subscriptionResult.data?.billing_interval ?? null
  )

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate()
  const dailySpend = daysInMonth > 0 ? estimatedMonthlySpend / daysInMonth : 0

  let cumulativeSpend = 0
  const spend = activity.map((point) => {
    cumulativeSpend += dailySpend
    return {
      date: point.date,
      spend: Number(cumulativeSpend.toFixed(2)),
      messages: point.messages,
    }
  })

  return {
    totalChats: totalChatsResult.count ?? 0,
    totalMessages: totalMessagesResult.count ?? 0,
    monthMessages: monthMessagesResult.count ?? 0,
    activeDaysLast14,
    plan,
    status: subscriptionResult.data?.status ?? "active",
    estimatedMonthlySpend,
    activity,
    spend,
  }
}
