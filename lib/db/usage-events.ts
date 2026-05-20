import { getBillingPlan } from "@/lib/billing-plans"
import { createServiceClient } from "@/lib/supabase/service"
import type { Json } from "@/types/supabase"

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
  metadata?: Json
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
  metadata,
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
      ...(metadata !== undefined ? { metadata } : {}),
    },
    { onConflict: "event_key" }
  )

  if (error) {
    return
  }
}

type KnowledgeBaseAuditAction =
  | "knowledge_base_upload"
  | "knowledge_base_delete"
  | "knowledge_base_link"
  | "knowledge_base_unlink"

type RecordKnowledgeBaseAuditEventInput = {
  eventKey: string
  userId: string
  action: KnowledgeBaseAuditAction
  fileId?: string | null
  agentId?: string | null
  sourceSurface: "admin" | "dashboard"
  metadata?: Json
}

export async function recordKnowledgeBaseAuditEvent({
  eventKey,
  userId,
  action,
  fileId = null,
  agentId = null,
  sourceSurface,
  metadata,
}: RecordKnowledgeBaseAuditEventInput): Promise<void> {
  const service = createServiceClient()

  const { data: subscription } = await service
    .from("subscriptions")
    .select("plan, billing_interval")
    .eq("user_id", userId)
    .maybeSingle()

  const plan = getBillingPlan(subscription?.plan).id

  await service.from("usage_events").upsert(
    {
      event_key: eventKey,
      user_id: userId,
      chat_id: null,
      turn_key: agentId,
      source: "chat",
      event_type: action,
      request_trigger: sourceSurface,
      model: "knowledge-base",
      plan,
      billing_interval: subscription?.billing_interval ?? null,
      request_count: 0,
      user_message_chars: 0,
      assistant_message_chars: 0,
      metadata: {
        fileId,
        agentId,
        sourceSurface,
        ...(metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? metadata
          : {}),
      },
    },
    { onConflict: "event_key" }
  )
}
