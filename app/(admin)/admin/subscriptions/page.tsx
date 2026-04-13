import { SubscriptionsAnalytics } from "./components/subscriptions-analytics"
import { getSubscriptionInsights } from "@/lib/db/admin"

export default async function SubscriptionsPage() {
  const insights = await getSubscriptionInsights(6)

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:gap-8 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue and retention analytics across all plans.
        </p>
      </div>

      <SubscriptionsAnalytics insights={insights} />
    </div>
  )
}
