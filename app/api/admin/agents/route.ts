import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  adminCreateAgent,
  adminDeleteAgents,
  getAllAgents,
} from "@/lib/db/admin"
import { setAgentTabsForMany } from "@/lib/db/admin-agent-tabs"
import { setBuiltinAgentLayers } from "@/lib/db/builtin-agent-layer-access"
import { removeBuiltinAgentLayerMapping } from "@/lib/db/builtin-agent-layer-access"
import { z } from "zod"

const layerSchema = z.enum(["coach", "intelligence"])

const agentSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  description: z.string().nullable().optional(),
  system_prompt: z.string().min(1),
  base_model: z.string().min(1),
  category: z.string().nullable().optional(),
  is_builtin: z.boolean().optional().default(true),
  user_id: z.string().nullable().optional().default(null),
  layer_access: z.array(layerSchema).min(1).default(["coach", "intelligence"]),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
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
  const agents = await getAllAgents()
  return NextResponse.json(agents)
}

export async function POST(request: Request) {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body: unknown = await request.json()
  const parsed = agentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { layer_access: layerAccess, ...agentPayload } = parsed.data

  const agent = await adminCreateAgent({
    ...agentPayload,
    description: agentPayload.description ?? null,
    category: agentPayload.category ?? null,
    is_builtin: true,
    user_id: null,
  })
  if (!agent) {
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    )
  }

  await setBuiltinAgentLayers(agent.id, layerAccess)

  return NextResponse.json(agent, { status: 201 })
}

export async function DELETE(request: Request) {
  const admin = await assertAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body: unknown = await request.json().catch(() => null)
  const parsed = bulkDeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const ids = Array.from(new Set(parsed.data.ids))
  const ok = await adminDeleteAgents(ids)
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to delete agents" },
      { status: 500 }
    )
  }

  await setAgentTabsForMany(ids, [])
  await Promise.all(ids.map((id) => removeBuiltinAgentLayerMapping(id)))

  return new NextResponse(null, { status: 204 })
}
