import { Bot, CreditCard, MessageSquare, Users } from "lucide-react"
import { OverviewCharts } from "./components/overview-charts"
import { getAdminStats, getOverviewChartData } from "@/lib/db/admin"

export default async function AdminPage() {
  const [stats, overviewChartData] = await Promise.all([
    getAdminStats(),
    getOverviewChartData(7),
  ])

  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
    },
    {
      label: "Total Agents",
      value: stats.totalAgents,
      icon: Bot,
    },
    {
      label: "Total Chats",
      value: stats.totalChats,
      icon: MessageSquare,
    },
    {
      label: "Active Subscriptions",
      value: stats.totalSubscriptions,
      icon: CreditCard,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:gap-8 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide statistics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/6">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <OverviewCharts data={overviewChartData} />
    </div>
  )
}
