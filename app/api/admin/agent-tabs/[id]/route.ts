import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteAdminAgentTab } from "@/lib/db/admin-agent-tabs"

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return profile?.role === "admin" ? user : null
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await deleteAdminAgentTab(id)

  return new NextResponse(null, { status: 204 })
}
