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
import type { OverviewChartPoint } from "@/lib/db/admin"

type Props = {
  data: OverviewChartPoint[]
}

const activityConfig = {
  users: {
    label: "Users",
    color: "var(--chart-1)",
  },
  chats: {
    label: "Chats",
    color: "var(--chart-2)",
  },
  subscriptions: {
    label: "Subscriptions",
    color: "oklch(0.69 0.02 80)",
  },
} satisfies ChartConfig

const revenueConfig = {
  estimatedMrr: {
    label: "Estimated MRR",
    color: "var(--chart-1)",
  },
  subscriptions: {
    label: "New subscriptions",
    color: "oklch(0.75 0.01 285)",
  },
} satisfies ChartConfig

export function OverviewCharts({ data }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-border/60 bg-background p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium">Activity</h2>
          <p className="text-xs text-muted-foreground">
            User, chat, and subscription volume over the last 7 days.
          </p>
        </div>

        <ChartContainer config={activityConfig} className="h-[260px] w-full">
          <LineChart data={data} margin={{ left: 12, right: 12, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} width={26} />
            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
            <Line
              dataKey="users"
              type="monotone"
              stroke="var(--color-users)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="chats"
              type="monotone"
              stroke="var(--color-chats)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="subscriptions"
              type="monotone"
              stroke="var(--color-subscriptions)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="rounded-xl border border-border/60 bg-background p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium">Revenue Pulse</h2>
          <p className="text-xs text-muted-foreground">
            Estimated monthly recurring revenue booked per day.
          </p>
        </div>

        <ChartContainer config={revenueConfig} className="h-[260px] w-full">
          <BarChart data={data} margin={{ left: 12, right: 12, top: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} width={36} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === "estimatedMrr") {
                      return `$${Number(value).toLocaleString()}`
                    }

                    return Number(value).toLocaleString()
                  }}
                />
              }
              cursor={false}
            />
            <Bar
              dataKey="estimatedMrr"
              fill="var(--color-estimatedMrr)"
              radius={[6, 6, 0, 0]}
            />
            <Line
              dataKey="subscriptions"
              type="monotone"
              stroke="var(--color-subscriptions)"
              strokeWidth={2}
              dot={false}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
