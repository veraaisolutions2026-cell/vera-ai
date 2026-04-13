"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { SubscriptionInsights } from "@/lib/db/admin"

type Props = {
  insights: SubscriptionInsights
}

const trendConfig = {
  starts: {
    label: "Starts",
    color: "var(--chart-1)",
  },
  churned: {
    label: "Churned",
    color: "oklch(0.69 0.2 25)",
  },
  net: {
    label: "Net",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const plansConfig = {
  count: {
    label: "Subscriptions",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function SubscriptionsAnalytics({ insights }: Props) {
  const stats = [
    {
      label: "Active",
      value: insights.activeCount,
      suffix: "accounts",
    },
    {
      label: "Trialing",
      value: insights.trialingCount,
      suffix: "accounts",
    },
    {
      label: "Cancel at period end",
      value: insights.cancelAtPeriodEnd,
      suffix: "accounts",
    },
    {
      label: "Estimated MRR",
      value: `$${insights.estimatedMrr.toLocaleString()}`,
      suffix: "USD",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/60 bg-background p-5"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground">{item.suffix}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background p-5">
          <div className="mb-4">
            <h2 className="text-sm font-medium">Monthly Flow</h2>
            <p className="text-xs text-muted-foreground">
              Subscription starts and churn trend over the last 6 months.
            </p>
          </div>

          <ChartContainer config={trendConfig} className="h-70 w-full">
            <LineChart
              data={insights.monthlyTrend}
              margin={{ left: 12, right: 12, top: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Line
                dataKey="starts"
                type="monotone"
                stroke="var(--color-starts)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="churned"
                type="monotone"
                stroke="var(--color-churned)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="net"
                type="monotone"
                stroke="var(--color-net)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-5">
          <div className="mb-4">
            <h2 className="text-sm font-medium">Plan Mix</h2>
            <p className="text-xs text-muted-foreground">
              Active and trialing subscriptions by plan.
            </p>
          </div>

          <ChartContainer config={plansConfig} className="h-70 w-full">
            <BarChart
              data={insights.planBreakdown}
              margin={{ left: 12, right: 12, top: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="plan"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {insights.planBreakdown.map((entry) => (
                  <Cell key={entry.plan} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
