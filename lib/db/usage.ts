import { createServiceClient } from "@/lib/supabase/service"
import {
  formatApproximateRequests,
  getBillingPlan,
  getMonthlyUsageBudgetUsd,
  type PlanId,
} from "@/lib/billing-plans"
import { getUsageAvailability } from "@/lib/db/usage-limits"

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
  monthlyRequestLimit: number | null
  remainingRequests: number | null
  usagePercent: number | null
  isExhausted: boolean
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
    service
      .from("usage_events")
      .select("event_key", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "chat_request_completed")
      .in("request_trigger", ["regenerate-message", "resume-stream"]),
    service
      .from("usage_events")
      .select("event_key", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "chat_request_completed")
      .in("request_trigger", ["regenerate-message", "resume-stream"])
      .gte("occurred_at", monthStartIso),
    service
      .from("usage_events")
      .select("occurred_at")
      .eq("user_id", userId)
      .eq("event_type", "chat_request_completed")
      .in("request_trigger", ["regenerate-message", "resume-stream"])
      .gte("occurred_at", start14Iso),
  ])

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

  const [
    totalRequestsResult,
    monthRequestsResult,
    recentRequestsResult,
    regenerateTotalResult,
    regenerateMonthResult,
    regenerateRecentResult,
  ] = usageEventsQueries
  const [fallbackTotalResult, fallbackMonthResult, fallbackRecentResult] =
    fallbackQueries

  const usageEventsAvailable = usageEventsQueries.every(
    (result) => !result.error
  )
  const fallbackAvailable = fallbackQueries.every((result) => !result.error)

  const usageEventsTotal = usageEventsAvailable
    ? (totalRequestsResult.count ?? 0)
    : 0
  const usageEventsMonth = usageEventsAvailable
    ? (monthRequestsResult.count ?? 0)
    : 0
  const regenerateTotal = usageEventsAvailable
    ? (regenerateTotalResult?.count ?? 0)
    : 0
  const regenerateMonth = usageEventsAvailable
    ? (regenerateMonthResult?.count ?? 0)
    : 0
  const fallbackTotal = fallbackAvailable ? (fallbackTotalResult.count ?? 0) : 0
  const fallbackMonth = fallbackAvailable ? (fallbackMonthResult.count ?? 0) : 0

  if (!usageEventsAvailable && !fallbackAvailable) {
    return {
      totalRequests: 0,
      monthRequests: 0,
      recentRequestTimestamps: [],
    }
  }

  const combinedTotal = Math.max(
    usageEventsTotal,
    fallbackTotal + regenerateTotal
  )
  const combinedMonth = Math.max(
    usageEventsMonth,
    fallbackMonth + regenerateMonth
  )

  const usageRecent =
    recentRequestsResult.data?.flatMap((row) =>
      row.occurred_at ? [row.occurred_at] : []
    ) ?? []
  const fallbackRecent =
    fallbackRecentResult.data?.flatMap((row) =>
      row.created_at ? [row.created_at] : []
    ) ?? []
  const regenerateRecent =
    regenerateRecentResult?.data?.flatMap((row) =>
      row.occurred_at ? [row.occurred_at] : []
    ) ?? []

  const fallbackRecentMerged = [...fallbackRecent, ...regenerateRecent]
  const recentRequestTimestamps =
    fallbackRecentMerged.length > usageRecent.length
      ? fallbackRecentMerged
      : usageRecent

  return {
    totalRequests: combinedTotal,
    monthRequests: combinedMonth,
    recentRequestTimestamps,
  }
}

export async function getUsageAnalytics(
  userId: string
): Promise<UsageAnalytics> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start14 = new Date(today)
  start14.setDate(start14.getDate() - 13)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartIso = monthStart.toISOString()
  const start14Iso = start14.toISOString()

  const [usageSource, usageAvailability] = await Promise.all([
    getUsageSource(userId, monthStartIso, start14Iso),
    getUsageAvailability(userId),
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

  const plan = usageAvailability.plan
  const includedRequestsLabel = formatApproximateRequests(
    getBillingPlan(plan).approximateMonthlyRequests
  )
  const monthlyUsageBudgetUsd = getMonthlyUsageBudgetUsd(
    plan,
    usageAvailability.billingInterval
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
    monthRequests: usageAvailability.monthRequests,
    monthlyRequestLimit: usageAvailability.monthlyRequestLimit,
    remainingRequests: usageAvailability.remainingRequests,
    usagePercent:
      usageAvailability.monthlyRequestLimit &&
      usageAvailability.monthlyRequestLimit > 0
        ? Math.min(
            100,
            Math.round(
              (usageAvailability.monthRequests /
                usageAvailability.monthlyRequestLimit) *
                100
            )
          )
        : null,
    isExhausted: !usageAvailability.isAvailable,
    activeDaysLast14,
    plan,
    status: usageAvailability.status,
    monthlyUsageBudgetUsd,
    includedRequestsLabel,
    activity,
    spend,
  }
}
