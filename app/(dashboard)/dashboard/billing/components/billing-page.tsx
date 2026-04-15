"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Check, Loader2, Zap, Building2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { BILLING_PLAN_LIST, type PlanId } from "@/lib/billing-plans"
import { cn } from "@/lib/utils"
import type { Subscription } from "@/lib/db/subscriptions"

type Props = {
  subscription: Subscription | null
}

const PLAN_ICONS = {
  free: Sparkles,
  pro: Zap,
  enterprise: Building2,
} as const

export function BillingPage({ subscription }: Props) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly")
  const [loading, setLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Subscription activated! Welcome to your new plan.")
      window.history.replaceState({}, "", "/dashboard/billing")
    } else if (searchParams.get("canceled") === "1") {
      toast("Checkout cancelled.")
      window.history.replaceState({}, "", "/dashboard/billing")
    }
  }, [searchParams])

  const currentPlan = (subscription?.plan ?? "free") as PlanId

  async function handleUpgrade(planId: PlanId) {
    if (planId === "free") return
    setLoading(planId)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Failed to start checkout")
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Interval toggle */}
      <div className="mb-6 flex w-fit items-center gap-1 rounded-full border border-border/50 bg-muted/30 p-0.5">
        {(["monthly", "annual"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setInterval(v)}
            className="relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
          >
            {interval === v && (
              <motion.span
                layoutId="interval-pill"
                className="absolute inset-0 rounded-full bg-background shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
            <span
              className={cn(
                "relative z-10 transition-colors",
                interval === v
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {v === "monthly" ? "Monthly" : "Annual"}
            </span>
            {v === "annual" && (
              <span className="relative z-10 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/70">
                −20%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BILLING_PLAN_LIST.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const price = plan.price[interval]
          const Icon = PLAN_ICONS[plan.id]

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-xl p-5 transition-all",
                plan.highlighted
                  ? "bg-amber-500/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(251,191,36,0.25)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] dark:ring-1 dark:ring-amber-500/20"
                  : "bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <div className="rounded-b-full bg-amber-500 px-3 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                    Popular
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-3 flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    plan.highlighted
                      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-foreground/6 text-foreground/70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">{plan.name}</span>
                {isCurrent && (
                  <span className="ml-auto rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground/70 ring-1 ring-foreground/10">
                    Active
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-3">
                {price === 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">
                      Free
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${plan.id}-${price}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="text-2xl font-bold tracking-tight"
                      >
                        ${price}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-xs text-muted-foreground">
                      /month
                    </span>
                    {interval === "annual" && (
                      <span className="ml-1 text-[11px] text-muted-foreground/60 line-through">
                        ${plan.price.monthly}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                {plan.description}
              </p>

              {/* Features */}
              <ul className="mb-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        plan.highlighted
                          ? "text-amber-500"
                          : "text-foreground/40"
                      )}
                    />
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => handleUpgrade(plan.id)}
                disabled={
                  isCurrent || plan.id === "free" || loading === plan.id
                }
                className={cn(
                  "flex h-9 w-full items-center justify-center gap-2 rounded-full text-xs font-medium transition-all",
                  isCurrent
                    ? "cursor-default bg-foreground/6 text-muted-foreground"
                    : plan.highlighted
                      ? "bg-amber-500 text-white hover:bg-amber-500/90"
                      : "bg-foreground text-background hover:opacity-80",
                  "disabled:opacity-50"
                )}
              >
                {loading === plan.id && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {isCurrent
                  ? "Current plan"
                  : plan.id === "free"
                    ? "Downgrade"
                    : `Upgrade to ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs text-muted-foreground/50">
        Payments are processed securely by Stripe. Cancel anytime.
      </p>
    </div>
  )
}
