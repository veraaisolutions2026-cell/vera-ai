import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUsageAnalytics } from "@/lib/db/usage"
import { UsageOverview } from "./components/usage-overview"

export default async function UsagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const usage = await getUsageAnalytics(user.id)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track activity and billing trends for your workspace.
        </p>
      </div>

      <UsageOverview usage={usage} />
    </div>
  )
}
