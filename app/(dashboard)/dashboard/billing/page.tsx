import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/db/subscriptions"
import { isAdminUnlimitedModeEnabled } from "@/lib/db/admin-unlimited-mode"
import { BillingPage } from "./components/billing-page"

export default async function BillingRoute() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [subscription, isAdminUnlimitedMode] = await Promise.all([
    getSubscription(user.id),
    isAdminUnlimitedModeEnabled(user.id),
  ])

  return (
    <BillingPage
      subscription={subscription}
      isAdminUnlimitedMode={isAdminUnlimitedMode}
    />
  )
}
