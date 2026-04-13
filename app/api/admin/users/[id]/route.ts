import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { adminDeleteUser, adminUpdateUserRole } from "@/lib/db/admin"
import { z } from "zod"

const schema = z.object({
  role: z.enum(["admin", "user", "viewer"]),
})

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body: unknown = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const ok = await adminUpdateUserRole(id, parsed.data.role)
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
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
  if (id === admin.id) {
    return NextResponse.json(
      { error: "You cannot remove your own admin account" },
      { status: 400 }
    )
  }

  const ok = await adminDeleteUser(id)
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }

  return new NextResponse(null, { status: 204 })
}
