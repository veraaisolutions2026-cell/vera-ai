import { createClient } from "@/lib/supabase/server"

export type Subscription = {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  plan: "vera-coach" | "vera-intelligence"
  billing_interval: "monthly" | "annual" | null
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export async function getSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error) return null
  return data as Subscription
}

export async function upsertSubscription(
  userId: string,
  fields: Partial<Subscription>
): Promise<void> {
  const supabase = await createClient()
  await supabase.from("subscriptions").upsert({ user_id: userId, ...fields })
}
