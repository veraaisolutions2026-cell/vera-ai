export type PlanId = "vera-coach" | "vera-intelligence"

type BillingPlan = {
  id: PlanId
  name: string
  description: string
  price: {
    monthly: number
    annual: number
  }
  highlighted: boolean
  approximateMonthlyRequests: number
  monthlyUsageBudgetUsd: {
    monthly: number
    annual: number
  }
  customAgentLimit: number | null
  features: string[]
}

const BILLING_PLANS: Record<PlanId, BillingPlan> = {
  "vera-coach": {
    id: "vera-coach",
    name: "Vera Coach",
    description: "Chat-focused package with built-in agents.",
    price: { monthly: 49, annual: 39 },
    highlighted: false,
    approximateMonthlyRequests: 500,
    monthlyUsageBudgetUsd: {
      monthly: 34.3,
      annual: 27.3,
    },
    customAgentLimit: 0,
    features: [
      "Chat workspace",
      "Built-in agents",
      "About 500 requests / month",
      "PDF, Markdown & text export",
      "No custom agent creation",
    ],
  },
  "vera-intelligence": {
    id: "vera-intelligence",
    name: "Vera Intelligence",
    description: "Advanced package with agent and knowledge capabilities.",
    price: { monthly: 149, annual: 119 },
    highlighted: true,
    approximateMonthlyRequests: 1500,
    monthlyUsageBudgetUsd: {
      monthly: 104.3,
      annual: 83.3,
    },
    customAgentLimit: null,
    features: [
      "Unlimited custom agents",
      "About 1,500 requests / month",
      "Knowledge-base tooling",
      "Agent-to-file linking",
      "Priority support",
    ],
  },
}

export const BILLING_PLAN_LIST = [
  BILLING_PLANS["vera-coach"],
  BILLING_PLANS["vera-intelligence"],
] as const

export function getBillingPlan(plan: string | null | undefined): BillingPlan {
  if (plan === "vera-coach" || plan === "vera-intelligence") {
    return BILLING_PLANS[plan]
  }

  return BILLING_PLANS["vera-coach"]
}

export function getMonthlyUsageBudgetUsd(
  plan: PlanId,
  interval: string | null | undefined
): number {
  return interval === "annual"
    ? BILLING_PLANS[plan].monthlyUsageBudgetUsd.annual
    : BILLING_PLANS[plan].monthlyUsageBudgetUsd.monthly
}

export function formatApproximateRequests(requests: number): string {
  return `About ${requests.toLocaleString()} requests / month`
}
