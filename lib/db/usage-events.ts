import { getBillingPlan } from "@/lib/billing-plans"
import { createServiceClient } from "@/lib/supabase/service"

type UsageSource = "chat" | "agent-builder"

type RecordUsageEventInput = {
  eventKey: string
  userId: string
  chatId?: string | null
  turnKey?: string | null
  source: UsageSource
  model: string
  requestTrigger?: string | null
  userMessageChars?: number
  assistantMessageChars?: number
}

export async function recordUsageEvent({
  eventKey,
  userId,
  chatId = null,
  turnKey = null,
  source,
  model,
  requestTrigger = null,
  userMessageChars = 0,
  assistantMessageChars = 0,
}: RecordUsageEventInput): Promise<void> {
  const service = createServiceClient()

  const { data: subscription } = await service
    .from("subscriptions")
    .select("plan, billing_interval")
    .eq("user_id", userId)
    .maybeSingle()

  const plan = getBillingPlan(subscription?.plan).id

  const { error } = await service.from("usage_events").upsert(
    {
      event_key: eventKey,
      user_id: userId,
      chat_id: chatId,
      turn_key: turnKey,
      source,
      event_type: "chat_request_completed",
      request_trigger: requestTrigger,
      model,
      plan,
      billing_interval: subscription?.billing_interval ?? null,
      request_count: 1,
      user_message_chars: userMessageChars,
      assistant_message_chars: assistantMessageChars,
    },
    { onConflict: "event_key" }
  )

  if (error) {
    return
  }
}
