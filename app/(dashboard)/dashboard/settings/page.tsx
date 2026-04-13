import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileSettings } from "./components/profile-settings"
import { SecuritySettings } from "./components/security-settings"
import { AppearanceSettings } from "./components/appearance-settings"
import { DangerZone } from "./components/danger-zone"
import type { UserData } from "@/types/database"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single()

  const provider = (user.app_metadata?.provider as string) ?? "email"
  const isGoogleUser = provider === "google"

  // Google: use OAuth avatar (always fresh). Email: use uploaded avatar from storage.
  const avatarUrl = isGoogleUser
    ? ((user.user_metadata?.avatar_url as string | null) ?? null)
    : (profile?.avatar_url ?? null)

  const userData: UserData = {
    id: user.id,
    email: user.email ?? "",
    name:
      profile?.full_name ??
      (user.user_metadata?.full_name as string | null) ??
      user.email?.split("@")[0] ??
      "User",
    avatarUrl,
    role: (profile?.role as UserData["role"]) ?? "user",
    provider,
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <ProfileSettings user={userData} />
        <SecuritySettings provider={provider} />
        <AppearanceSettings />
        <DangerZone />
      </div>
    </div>
  )
}
