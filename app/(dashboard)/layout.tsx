import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRecentChats } from "@/lib/db/chats"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { DashboardShell } from "./components/dashboard-shell"
import type { UserData } from "@/types/database"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [chats, profileResult, layerAccess] = await Promise.all([
    getRecentChats(user.id, 40),
    supabase
      .from("profiles")
      .select("full_name, avatar_url, role")
      .eq("id", user.id)
      .single(),
    getUserLayerAccess(user.id),
  ])

  const profile = profileResult.data
  const userData: UserData = {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? user.email?.split("@")[0] ?? "User",
    avatarUrl: profile?.avatar_url ?? null,
    role: (profile?.role as UserData["role"]) ?? "user",
  }

  return (
    <DashboardShell user={userData} chats={chats} layerAccess={layerAccess}>
      {children}
    </DashboardShell>
  )
}
