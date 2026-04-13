import { createClient } from "@/lib/supabase/server"

export async function getSystemConfig(key: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", key)
    .single()
  return data?.value ?? null
}

export async function setSystemConfig(
  key: string,
  value: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("system_config")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    )
}

export async function getSystemConfigWithMeta(
  key: string
): Promise<{ value: string; updated_at: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("system_config")
    .select("value, updated_at")
    .eq("key", key)
    .single()
  return data ?? null
}

export async function getAcaPrompt(): Promise<string | null> {
  return getSystemConfig("aca_master_prompt")
}
