import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/db/subscriptions"
import { BillingPage } from "./components/billing-page"

export default async function BillingRoute() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const subscription = await getSubscription(user.id)

  return <BillingPage subscription={subscription} />
}
