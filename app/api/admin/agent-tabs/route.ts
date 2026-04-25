import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  createAdminAgentTab,
  getAdminAgentTabsState,
} from "@/lib/db/admin-agent-tabs"

const createTabSchema = z.object({
  name: z.string().trim().min(1).max(40),
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

export async function GET() {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const state = await getAdminAgentTabsState()
  return NextResponse.json(state)
}

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = createTabSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid tab payload" },
      { status: 400 }
    )
  }

  try {
    const tab = await createAdminAgentTab(parsed.data.name)
    return NextResponse.json(tab, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create tab",
      },
      { status: 400 }
    )
  }
}
