export type PlanId = "free" | "pro" | "enterprise"

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
  free: {
    id: "free",
    name: "Starter",
    description: "For individuals exploring AI-assisted audit workflows.",
    price: { monthly: 0, annual: 0 },
    highlighted: false,
    approximateMonthlyRequests: 40,
    monthlyUsageBudgetUsd: {
      monthly: 2.2,
      annual: 2.2,
    },
    customAgentLimit: 0,
    features: [
      "3 built-in agents",
      "About 40 requests / month",
      "Export to Markdown & text",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For professionals running active audit engagements.",
    price: { monthly: 49, annual: 39 },
    highlighted: true,
    approximateMonthlyRequests: 500,
    monthlyUsageBudgetUsd: {
      monthly: 34.3,
      annual: 27.3,
    },
    customAgentLimit: 10,
    features: [
      "Unlimited built-in agents",
      "Up to 10 custom agents",
      "About 500 requests / month",
      "PDF, Markdown & text export",
      "File upload in chat",
      "Priority support",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For teams and firms with advanced compliance requirements.",
    price: { monthly: 149, annual: 119 },
    highlighted: false,
    approximateMonthlyRequests: 1500,
    monthlyUsageBudgetUsd: {
      monthly: 104.3,
      annual: 83.3,
    },
    customAgentLimit: null,
    features: [
      "Everything in Pro",
      "Unlimited custom agents",
      "About 1,500 requests / month",
      "Team workspace",
      "White-label option",
      "API access",
      "Dedicated onboarding",
      "SLA & custom contracts",
    ],
  },
}

export const BILLING_PLAN_LIST = [
  BILLING_PLANS.free,
  BILLING_PLANS.pro,
  BILLING_PLANS.enterprise,
] as const

export function getBillingPlan(plan: string | null | undefined): BillingPlan {
  if (plan === "pro" || plan === "enterprise") {
    return BILLING_PLANS[plan]
  }

  return BILLING_PLANS.free
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
