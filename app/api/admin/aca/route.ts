import { createClient } from "@/lib/supabase/server"
import { setSystemConfig } from "@/lib/db/system-config"
import { getResolvedAcaPrompt } from "@/lib/aca-prompt"
import { DEFAULT_ACA_PROMPT } from "@/lib/default-aca-prompt"

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

  const config = await getResolvedAcaPrompt()
  return Response.json({
    prompt: config.value,
    updated_at: config.updatedAt,
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

  const body = (await req.json()) as {
    prompt?: string
    action?: "reset-default"
  }

  if (body.action === "reset-default") {
    await setSystemConfig("aca_master_prompt", DEFAULT_ACA_PROMPT)

    return Response.json({
      ok: true,
      source: "default",
      prompt: DEFAULT_ACA_PROMPT,
      updated_at: new Date().toISOString(),
    })
  }

  if (!body.prompt?.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 })
  }

  await setSystemConfig("aca_master_prompt", body.prompt.trim())
  return Response.json({ ok: true })
}
