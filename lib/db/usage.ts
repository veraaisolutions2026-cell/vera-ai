import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  formatApproximateRequests,
  getBillingPlan,
  getMonthlyUsageBudgetUsd,
  type PlanId,
} from "@/lib/billing-plans"

type ActivityPoint = {
  date: string
  requests: number
}

type SpendPoint = {
  date: string
  spend: number
  requests: number
}

export type UsageAnalytics = {
  totalRequests: number
  monthRequests: number
  activeDaysLast14: number
  plan: PlanId
  status: string
  monthlyUsageBudgetUsd: number
  includedRequestsLabel: string
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

type UsageSource = {
  totalRequests: number
  monthRequests: number
  recentRequestTimestamps: string[]
}

async function getUsageSource(
  userId: string,
  monthStartIso: string,
  start14Iso: string
): Promise<UsageSource> {
  const service = createServiceClient()

  const usageEventsQueries = await Promise.all([
    service
      .from("usage_events")
      .select("event_key", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "chat_request_completed"),
    service
      .from("usage_events")
      .select("event_key", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "chat_request_completed")
      .gte("occurred_at", monthStartIso),
    service
      .from("usage_events")
      .select("occurred_at")
      .eq("user_id", userId)
      .eq("event_type", "chat_request_completed")
      .gte("occurred_at", start14Iso),
  ])

  const [totalRequestsResult, monthRequestsResult, recentRequestsResult] =
    usageEventsQueries

  const usageEventsAvailable = usageEventsQueries.every(
    (result) => !result.error
  )

  if (usageEventsAvailable) {
    return {
      totalRequests: totalRequestsResult.count ?? 0,
      monthRequests: monthRequestsResult.count ?? 0,
      recentRequestTimestamps:
        recentRequestsResult.data?.flatMap((row) =>
          row.occurred_at ? [row.occurred_at] : []
        ) ?? [],
    }
  }

  const fallbackQueries = await Promise.all([
    service
      .from("chat_turn_pairs")
      .select("turn_key", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("assistant_content", "__vera_pending_response__")
      .neq("assistant_content", "__PENDING__"),
    service
      .from("chat_turn_pairs")
      .select("turn_key", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("assistant_content", "__vera_pending_response__")
      .neq("assistant_content", "__PENDING__")
      .gte("created_at", monthStartIso),
    service
      .from("chat_turn_pairs")
      .select("created_at")
      .eq("user_id", userId)
      .neq("assistant_content", "__vera_pending_response__")
      .neq("assistant_content", "__PENDING__")
      .gte("created_at", start14Iso),
  ])

  const [fallbackTotalResult, fallbackMonthResult, fallbackRecentResult] =
    fallbackQueries

  return {
    totalRequests: fallbackTotalResult.count ?? 0,
    monthRequests: fallbackMonthResult.count ?? 0,
    recentRequestTimestamps:
      fallbackRecentResult.data?.flatMap((row) =>
        row.created_at ? [row.created_at] : []
      ) ?? [],
  }
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
  const monthStartIso = monthStart.toISOString()
  const start14Iso = start14.toISOString()

  const [usageSource, subscriptionResult] = await Promise.all([
    getUsageSource(userId, monthStartIso, start14Iso),
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
      requests: 0,
    }
  }

  usageSource.recentRequestTimestamps.forEach((createdAt) => {
    if (!createdAt) return
    const key = dayKey(new Date(createdAt))
    if (buckets[key]) buckets[key].requests += 1
  })

  const activity = Object.values(buckets)
  const activeDaysLast14 = activity.filter((point) => point.requests > 0).length

  const plan = getBillingPlan(subscriptionResult.data?.plan).id
  const includedRequestsLabel = formatApproximateRequests(
    getBillingPlan(plan).approximateMonthlyRequests
  )
  const monthlyUsageBudgetUsd = getMonthlyUsageBudgetUsd(
    plan,
    subscriptionResult.data?.billing_interval ?? null
  )

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate()
  const dailySpend = daysInMonth > 0 ? monthlyUsageBudgetUsd / daysInMonth : 0

  let cumulativeSpend = 0
  const spend = activity.map((point) => {
    cumulativeSpend += dailySpend
    return {
      date: point.date,
      spend: Number(cumulativeSpend.toFixed(2)),
      requests: point.requests,
    }
  })

  return {
    totalRequests: usageSource.totalRequests,
    monthRequests: usageSource.monthRequests,
    activeDaysLast14,
    plan,
    status: subscriptionResult.data?.status ?? "active",
    monthlyUsageBudgetUsd,
    includedRequestsLabel,
    activity,
    spend,
  }
}
