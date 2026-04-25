import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { setAgentTabsForMany } from "@/lib/db/admin-agent-tabs"

const assignmentSchema = z.object({
  agent_ids: z.array(z.string().uuid()).min(1),
  tab_ids: z.array(z.string().min(1)).default([]),
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

export async function PATCH(request: Request) {
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

  const parsed = assignmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid assignment payload",
      },
      { status: 400 }
    )
  }

  await setAgentTabsForMany(parsed.data.agent_ids, parsed.data.tab_ids)

  return NextResponse.json({ ok: true })
}
