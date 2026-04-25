"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  updateLayerCapabilities,
  type LayerCapabilities,
} from "@/lib/db/layer-capabilities"

const updateLayerCapabilitiesSchema = z.object({
  coachAllowBuiltInAgents: z.boolean(),
  coachAllowCustomAgentCrud: z.boolean(),
  coachAllowKnowledgeBaseManagement: z.boolean(),
  intelligenceAllowBuiltInAgents: z.boolean(),
  intelligenceAllowCustomAgentCrud: z.boolean(),
  intelligenceAllowKnowledgeBaseManagement: z.boolean(),
})

function hasCheckbox(formData: FormData, name: string): boolean {
  const rawValue = formData.get(name)
  return rawValue === "on" || rawValue === "true" || rawValue === "1"
}

async function assertAdminUser(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    throw new Error("Forbidden")
  }

  return user.id
}

export async function updateLayerCapabilitiesAction(
  formData: FormData
): Promise<void> {
  await assertAdminUser()

  const parsed = updateLayerCapabilitiesSchema.safeParse({
    coachAllowBuiltInAgents: hasCheckbox(formData, "coachAllowBuiltInAgents"),
    coachAllowCustomAgentCrud: hasCheckbox(
      formData,
      "coachAllowCustomAgentCrud"
    ),
    coachAllowKnowledgeBaseManagement: hasCheckbox(
      formData,
      "coachAllowKnowledgeBaseManagement"
    ),
    intelligenceAllowBuiltInAgents: hasCheckbox(
      formData,
      "intelligenceAllowBuiltInAgents"
    ),
    intelligenceAllowCustomAgentCrud: hasCheckbox(
      formData,
      "intelligenceAllowCustomAgentCrud"
    ),
    intelligenceAllowKnowledgeBaseManagement: hasCheckbox(
      formData,
      "intelligenceAllowKnowledgeBaseManagement"
    ),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid form payload")
  }

  const value: LayerCapabilities = {
    coach: {
      allowBuiltInAgents: parsed.data.coachAllowBuiltInAgents,
      allowCustomAgentCrud: parsed.data.coachAllowCustomAgentCrud,
      allowKnowledgeBaseManagement:
        parsed.data.coachAllowKnowledgeBaseManagement,
    },
    intelligence: {
      allowBuiltInAgents: parsed.data.intelligenceAllowBuiltInAgents,
      allowCustomAgentCrud: parsed.data.intelligenceAllowCustomAgentCrud,
      allowKnowledgeBaseManagement:
        parsed.data.intelligenceAllowKnowledgeBaseManagement,
    },
  }

  await updateLayerCapabilities(value)

  revalidatePath("/admin/vera-coach/entitlements")
  revalidatePath("/admin/vera-coach")
  revalidatePath("/admin/vera-intelligence")
}
