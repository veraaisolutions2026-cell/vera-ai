import { stripe } from "@/lib/stripe"
import { upsertSubscription } from "@/lib/db/subscriptions"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 })
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return new Response("Webhook signature verification failed", {
      status: 400,
    })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const userId = session.metadata?.user_id
      if (!userId) break

      await upsertSubscription(userId, {
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        plan: (session.metadata?.plan ?? "pro") as "pro" | "enterprise",
        billing_interval: (session.metadata?.interval ?? "monthly") as
          | "monthly"
          | "annual",
        status: "active",
      })
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object
      const customerId = sub.customer as string

      // Find user by Stripe customer ID
      const supabase = await createClient()
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single()

      if (!data?.user_id) break

      const status = sub.status
      const plan =
        status === "canceled" || status === "unpaid" ? "free" : undefined

      await upsertSubscription(data.user_id, {
        stripe_subscription_id: sub.id,
        status,
        current_period_end: new Date(
          (sub as unknown as { current_period_end: number })
            .current_period_end * 1000
        ).toISOString(),
        cancel_at_period_end:
          (sub as unknown as { cancel_at_period_end: boolean })
            .cancel_at_period_end ?? false,
        ...(plan ? { plan } : {}),
      })
      break
    }

    default:
      break
  }

  return new Response("ok")
}
