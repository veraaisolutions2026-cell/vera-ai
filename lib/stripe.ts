import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
})

/**
 * Pricing defined entirely in code - no Stripe Price IDs or env vars needed.
 * Checkout uses price_data inline. Amounts are in cents (USD).
 */
export const PLAN_PRICING: Record<
  string,
  { name: string; monthly: number; annual: number }
> = {
  "vera-coach": {
    name: "Vera Coach",
    monthly: 4900, // $49/mo
    annual: 39900, // $399/yr (~$33.25/mo)
  },
  "vera-intelligence": {
    name: "Vera Intelligence",
    monthly: 14900, // $149/mo
    annual: 119900, // $1,199/yr (~$99.92/mo)
  },
}
