import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminShell } from "./components/admin-shell"
import type { UserData } from "@/types/database"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (profile?.role !== "admin") redirect("/dashboard")

  const userData: UserData = {
    id: user.id,
    email: user.email ?? "",
    name: profile.full_name ?? user.email?.split("@")[0] ?? "Admin",
    avatarUrl: profile.avatar_url ?? null,
    role: "admin",
  }

  return <AdminShell user={userData}>{children}</AdminShell>
}
