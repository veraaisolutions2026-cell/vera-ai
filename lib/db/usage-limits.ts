import { getBillingPlan, type PlanId } from "@/lib/billing-plans"
import { createServiceClient } from "@/lib/supabase/service"

type SubscriptionStatus = {
  plan: string | null
  status: string | null
  billing_interval: string | null
}

export type UsageAvailability = {
  plan: PlanId
  status: string
  billingInterval: string | null
  monthlyRequestLimit: number | null
  monthRequests: number
  remainingRequests: number | null
  isAvailable: boolean
}

function getMonthStartIso(now: Date): string {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return monthStart.toISOString()
}

async function getMonthRequestCount(
  userId: string,
  monthStartIso: string
): Promise<number> {
  const service = createServiceClient()

  const [usageEventsResult, turnPairsResult, regenerateResult] =
    await Promise.all([
      service
        .from("usage_events")
        .select("event_key", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "chat_request_completed")
        .gte("occurred_at", monthStartIso),
      service
        .from("chat_turn_pairs")
        .select("turn_key", { count: "exact", head: true })
        .eq("user_id", userId)
        .neq("assistant_content", "__vera_pending_response__")
        .neq("assistant_content", "__PENDING__")
        .gte("created_at", monthStartIso),
      service
        .from("usage_events")
        .select("event_key", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "chat_request_completed")
        .in("request_trigger", ["regenerate-message", "resume-stream"])
        .gte("occurred_at", monthStartIso),
    ])

  const usageEventsCount = usageEventsResult.error
    ? 0
    : (usageEventsResult.count ?? 0)
  const turnPairsCount = turnPairsResult.error
    ? 0
    : (turnPairsResult.count ?? 0)
  const regenerateCount = regenerateResult.error
    ? 0
    : (regenerateResult.count ?? 0)

  if (
    usageEventsResult.error &&
    turnPairsResult.error &&
    regenerateResult.error
  ) {
    return 0
  }

  const turnPairBaseline = turnPairsCount + regenerateCount

  return Math.max(usageEventsCount, turnPairBaseline)
}

export async function getUsageAvailability(
  userId: string
): Promise<UsageAvailability> {
  const service = createServiceClient()

  const monthStartIso = getMonthStartIso(new Date())

  const [subscriptionResult, monthRequests] = await Promise.all([
    service
      .from("subscriptions")
      .select("plan, status, billing_interval")
      .eq("user_id", userId)
      .maybeSingle<SubscriptionStatus>(),
    getMonthRequestCount(userId, monthStartIso),
  ])

  const plan = getBillingPlan(subscriptionResult.data?.plan).id
  const status = subscriptionResult.data?.status ?? "active"

  const tierResult = await service
    .from("billing_tiers")
    .select("monthly_request_limit")
    .eq("plan", plan)
    .maybeSingle<{ monthly_request_limit: number | null }>()

  const fallbackLimit = getBillingPlan(plan).approximateMonthlyRequests
  const monthlyRequestLimit =
    tierResult.data?.monthly_request_limit ?? fallbackLimit

  const remainingRequests =
    monthlyRequestLimit === null
      ? null
      : Math.max(0, monthlyRequestLimit - monthRequests)

  return {
    plan,
    status,
    billingInterval: subscriptionResult.data?.billing_interval ?? null,
    monthlyRequestLimit,
    monthRequests,
    remainingRequests,
    isAvailable: remainingRequests === null || remainingRequests > 0,
  }
}
