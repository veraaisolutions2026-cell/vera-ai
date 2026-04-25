import { isAdminUnlimitedModeEnabled } from "@/lib/db/admin-unlimited-mode"
import { createClient } from "@/lib/supabase/server"
import { AdminUnlimitedModeForm } from "./components/admin-unlimited-mode-form"

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isUnlimitedEnabled = user
    ? await isAdminUnlimitedModeEnabled(user.id)
    : false

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage admin-level runtime controls for your account.
        </p>
      </div>

      <section className="rounded-xl border border-border/60 bg-muted/20 p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            Unlimited mode (this admin account)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Applies only to your current admin login. Usage tracking continues,
            but monthly limits are removed across dashboard usage checks.
          </p>
        </div>

        <AdminUnlimitedModeForm defaultEnabled={isUnlimitedEnabled} />
      </section>
    </div>
  )
}
