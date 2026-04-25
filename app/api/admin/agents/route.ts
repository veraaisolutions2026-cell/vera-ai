import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { adminCreateAgent, getAllAgents } from "@/lib/db/admin"
import { setBuiltinAgentLayers } from "@/lib/db/builtin-agent-layer-access"
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
