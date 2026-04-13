import { stripe, PLAN_PRICING } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/db/subscriptions"
import { z } from "zod"

const schema = z.object({
  plan: z.enum(["pro", "enterprise"]),
  interval: z.enum(["monthly", "annual"]),
})

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  const { plan, interval } = parsed.data
  const planConfig = PLAN_PRICING[plan]
  if (!planConfig) {
    return Response.json({ error: "Plan not found" }, { status: 400 })
  }

  const origin =
    req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? ""

  // Reuse existing customer if we have one
  // Note: customer_creation is payment-mode only — subscription mode creates customer from email automatically
  const existing = await getSubscription(user.id)
  const customerParam = existing?.stripe_customer_id
    ? { customer: existing.stripe_customer_id }
    : { customer_email: user.email }

  const session = await stripe.checkout.sessions.create({
    ...customerParam,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Vera AI ${planConfig.name}` },
          unit_amount:
            interval === "monthly" ? planConfig.monthly : planConfig.annual,
          recurring: {
            interval: interval === "monthly" ? "month" : "year",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/dashboard/billing?success=1`,
    cancel_url: `${origin}/dashboard/billing?canceled=1`,
    metadata: { user_id: user.id, plan, interval },
  })

  return Response.json({ url: session.url })
}
