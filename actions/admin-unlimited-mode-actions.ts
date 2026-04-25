"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { setAdminUnlimitedMode } from "@/lib/db/admin-unlimited-mode"

async function assertAdminUser(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    throw new Error("Forbidden")
  }

  return user.id
}

export async function updateAdminUnlimitedModeAction(
  formData: FormData
): Promise<void> {
  const adminUserId = await assertAdminUser()
  const rawValue = formData.get("adminUnlimitedMode")
  const enabled = rawValue === "on" || rawValue === "true" || rawValue === "1"

  await setAdminUnlimitedMode(adminUserId, enabled)

  revalidatePath("/admin")
  revalidatePath("/admin/settings")
  revalidatePath("/dashboard/billing")
  revalidatePath("/dashboard/usage")
  revalidatePath("/dashboard", "layout")
}
