import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { setAgentTabsForMany } from "@/lib/db/admin-agent-tabs"
import { adminDeleteAgent, adminUpdateAgent } from "@/lib/db/admin"
import {
  removeBuiltinAgentLayerMapping,
  setBuiltinAgentLayers,
} from "@/lib/db/builtin-agent-layer-access"
import { z } from "zod"

const layerSchema = z.enum(["coach", "intelligence"])

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  system_prompt: z.string().min(1).optional(),
  base_model: z.string().min(1).optional(),
  category: z.string().nullable().optional(),
  is_builtin: z.boolean().optional(),
  user_id: z.string().nullable().optional(),
  layer_access: z.array(layerSchema).min(1).optional(),
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
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { layer_access: layerAccess, ...agentPayload } = parsed.data

  const agent = await adminUpdateAgent(id, {
    ...agentPayload,
    is_builtin: true,
    user_id: null,
  })
  if (!agent) {
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    )
  }

  if (layerAccess) {
    await setBuiltinAgentLayers(id, layerAccess)
  }

  return NextResponse.json(agent)
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
  const ok = await adminDeleteAgent(id)
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    )
  }

  await removeBuiltinAgentLayerMapping(id)
  await setAgentTabsForMany([id], [])

  return new NextResponse(null, { status: 204 })
}
