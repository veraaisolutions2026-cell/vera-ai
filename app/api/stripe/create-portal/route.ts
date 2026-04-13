import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/db/subscriptions"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const subscription = await getSubscription(user.id)
  if (!subscription?.stripe_customer_id) {
    return Response.json({ error: "No billing account found" }, { status: 404 })
  }

  const origin =
    req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? ""

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/dashboard/billing`,
  })

  return Response.json({ url: portalSession.url })
}
