"use client"

import Link from "next/link"
import { useState } from "react"
import { Check } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import { BILLING_PLAN_LIST } from "@/lib/billing-plans"
import {
  Tabs,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
  TabsHighlight,
  TabsHighlightItem,
} from "@/components/animate-ui/primitives/radix/tabs"

const EASE = [0.16, 1, 0.3, 1] as const

export function PricingPlans() {
  const [annual, setAnnual] = useState(true)
  const reduce = useReducedMotion()
  const y = reduce ? 0 : 36
  const dur = reduce ? 0 : 0.65

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-plans-heading"
      className="px-6 py-14 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: dur, ease: EASE }}
          className="mb-12 flex flex-col items-center text-center"
        >
          <h2
            id="pricing-plans-heading"
            className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Simple, transparent pricing
          </h2>
          <p className="mb-8 max-w-md text-base text-muted-foreground">
            Start with what you need. Upgrade as your team grows.
          </p>

          {/* Billing toggle */}
          <Tabs
            value={annual ? "annual" : "monthly"}
            onValueChange={(v) => setAnnual(v === "annual")}
          >
            <TabsHighlight
              className="absolute inset-0 z-0 rounded-full bg-foreground shadow-sm"
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <TabsListPrimitive className="relative inline-flex h-9 items-stretch justify-center gap-0 rounded-full border border-border bg-muted/40 p-1">
                <TabsHighlightItem
                  value="monthly"
                  className="flex h-full items-stretch"
                >
                  <TabsTriggerPrimitive
                    value="monthly"
                    className="relative z-10 flex h-full items-center rounded-full px-5 text-xs font-medium transition-colors duration-300 data-[state=active]:text-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  >
                    Monthly
                  </TabsTriggerPrimitive>
                </TabsHighlightItem>
                <TabsHighlightItem
                  value="annual"
                  className="flex h-full items-stretch"
                >
                  <TabsTriggerPrimitive
                    value="annual"
                    className="group relative z-10 flex h-full items-center gap-2 rounded-full px-5 text-xs font-medium transition-colors duration-300 data-[state=active]:text-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
                  >
                    Annual
                    <span className="rounded-full bg-foreground/12 px-2 py-px text-[10px] leading-none font-semibold text-foreground/60 group-data-[state=active]:bg-background/20 group-data-[state=active]:text-background/80">
                      Save 20%
                    </span>
                  </TabsTriggerPrimitive>
                </TabsHighlightItem>
              </TabsListPrimitive>
            </TabsHighlight>
          </Tabs>
        </motion.div>

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {BILLING_PLAN_LIST.map((plan, i) => {
            const price = annual ? plan.price.annual : plan.price.monthly

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: reduce ? 0 : 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{
                  duration: reduce ? 0 : 0.6,
                  ease: EASE,
                  delay: reduce ? 0 : i * 0.1,
                }}
                className={cn(
                  "flex flex-col rounded-2xl border p-7 transition-shadow",
                  plan.highlighted
                    ? "border-2 border-foreground/40 bg-card shadow-sm"
                    : "border-border bg-card hover:shadow-sm"
                )}
              >
                {/* Plan header */}
                <div className="mb-6">
                  {plan.highlighted && (
                    <div className="mb-3 inline-flex">
                      <span className="rounded-full border border-foreground/20 bg-foreground/6 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                        Most popular
                      </span>
                    </div>
                  )}
                  <p className="mb-1 text-sm font-medium text-muted-foreground">
                    {plan.name}
                  </p>
                  <div className="mb-2 flex items-end gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight">
                      ${price}
                    </span>
                    <span className="mb-1 text-sm text-muted-foreground">
                      / month
                    </span>
                  </div>
                  {annual && (
                    <p className="text-xs text-muted-foreground">
                      Billed annually · ${plan.price.annual * 12}/yr
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                {/* CTA */}
                <Link
                  href="/register"
                  className={cn(
                    "mb-6 flex h-10 w-full items-center justify-center rounded-full text-sm font-medium transition-colors",
                    plan.highlighted
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-foreground/8 text-foreground ring-1 ring-foreground/10 ring-inset hover:bg-foreground/12"
                  )}
                >
                  Get started
                </Link>

                <div className="h-px w-full bg-border" />

                {/* Features */}
                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            duration: reduce ? 0 : 0.5,
            ease: EASE,
            delay: reduce ? 0 : 0.2,
          }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          *Usage limits apply. Prices shown don&apos;t include applicable tax.
          Prices and plans are subject to change at Vera&apos;s discretion.
        </motion.p>
      </div>
    </section>
  )
}
