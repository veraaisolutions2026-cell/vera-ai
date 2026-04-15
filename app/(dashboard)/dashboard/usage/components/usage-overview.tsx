"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type { UsageAnalytics } from "@/lib/db/usage"

type Props = {
  usage: UsageAnalytics
}

const activityConfig = {
  requests: {
    label: "Requests",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

const spendConfig = {
  spend: {
    label: "Spend",
    color: "oklch(0.83 0.005 286)",
  },
  requests: {
    label: "Requests",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function UsageOverview({ usage }: Props) {
  const cards = [
    {
      label: "Total Requests",
      value: usage.totalRequests.toLocaleString(),
      sub: "Completed AI requests",
    },
    {
      label: "Requests This Month",
      value: usage.monthRequests.toLocaleString(),
      sub: usage.includedRequestsLabel,
    },
    {
      label: "Active Days",
      value: usage.activeDaysLast14.toLocaleString(),
      sub: "Last 14 days",
    },
    {
      label: "Current Plan",
      value: usage.plan.toUpperCase(),
      sub: `${usage.status} • ${usage.includedRequestsLabel}`,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
          <div className="mb-4">
            <h2 className="text-sm font-medium">Activity</h2>
            <p className="text-xs text-muted-foreground">
              Completed AI requests over the last 14 days.
            </p>
          </div>

          <ChartContainer config={activityConfig} className="h-70 w-full">
            <LineChart
              data={usage.activity}
              margin={{ left: 12, right: 12, top: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} width={28} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <Line
                dataKey="requests"
                type="monotone"
                stroke="var(--color-requests)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="rounded-xl bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
          <div className="mb-4">
            <h2 className="text-sm font-medium">Spend</h2>
            <p className="text-xs text-muted-foreground">
              Estimated cumulative AI cost budget for the current month.
            </p>
          </div>

          <ChartContainer config={spendConfig} className="h-70 w-full">
            <BarChart
              data={usage.spend}
              margin={{ left: 12, right: 12, top: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, key) => {
                      if (key === "spend") return `$${Number(value).toFixed(2)}`
                      return Number(value).toLocaleString()
                    }}
                  />
                }
                cursor={false}
              />
              <Bar
                dataKey="spend"
                fill="var(--color-spend)"
                radius={[6, 6, 0, 0]}
              />
              <Line
                dataKey="requests"
                type="monotone"
                stroke="var(--color-requests)"
                strokeWidth={2}
                dot={false}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  )
}
