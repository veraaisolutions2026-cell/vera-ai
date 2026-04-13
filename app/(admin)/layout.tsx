import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "./admin/components/admin-sidebar"
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

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AdminSidebar user={userData} />
      <main className="my-2 mr-2 flex flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        {children}
      </main>
    </div>
  )
}
