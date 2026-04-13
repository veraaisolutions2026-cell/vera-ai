import { createClient } from "@/lib/supabase/server"
import {
  getSystemConfigWithMeta,
  setSystemConfig,
} from "@/lib/db/system-config"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin")
    return new Response("Forbidden", { status: 403 })

  const config = await getSystemConfigWithMeta("aca_master_prompt")
  return Response.json({
    prompt: config?.value ?? null,
    updated_at: config?.updated_at ?? null,
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin")
    return new Response("Forbidden", { status: 403 })

  const body = (await req.json()) as { prompt?: string }
  if (!body.prompt?.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 })
  }

  await setSystemConfig("aca_master_prompt", body.prompt.trim())
  return Response.json({ ok: true })
}
