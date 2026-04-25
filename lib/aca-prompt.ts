import { getSystemConfigWithMeta } from "@/lib/db/system-config"
import { DEFAULT_ACA_PROMPT } from "@/lib/default-aca-prompt"

export type ResolvedAcaPrompt = {
  value: string
  updatedAt: string | null
  source: "configured" | "default"
}

export async function getResolvedAcaPrompt(): Promise<ResolvedAcaPrompt> {
  const config = await getSystemConfigWithMeta("aca_master_prompt")
  const configuredValue = config?.value?.trim()
  const defaultValue = DEFAULT_ACA_PROMPT.trim()

  if (configuredValue) {
    if (configuredValue === defaultValue) {
      return {
        value: DEFAULT_ACA_PROMPT,
        updatedAt: config?.updated_at ?? null,
        source: "default",
      }
    }

    return {
      value: configuredValue,
      updatedAt: config?.updated_at ?? null,
      source: "configured",
    }
  }

  return {
    value: DEFAULT_ACA_PROMPT,
    updatedAt: null,
    source: "default",
  }
}
