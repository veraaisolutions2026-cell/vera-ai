import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  linkKnowledgeBaseFileToAgent,
  unlinkKnowledgeBaseFileFromAgent,
} from "@/lib/db/knowledge-base"
import { recordKnowledgeBaseAuditEvent } from "@/lib/db/usage-events"

const setLinksSchema = z.object({
  agentId: z.string().uuid(),
  fileIds: z.array(z.string().uuid()).default([]),
})

async function assertAdminUser() {
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
  const adminUser = await assertAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = setLinksSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid link payload",
      },
      { status: 400 }
    )
  }

  const selectedFileIds = Array.from(new Set(parsed.data.fileIds))
  const service = createServiceClient()

  const { data: existingLinks, error: linksError } = await service
    .from("agent_knowledge_base_files")
    .select("file_id")
    .eq("agent_id", parsed.data.agentId)

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 })
  }

  const existingFileIds = new Set(
    (existingLinks ?? []).map((link) => link.file_id)
  )
  const nextFileIds = new Set(selectedFileIds)

  const fileIdsToLink = selectedFileIds.filter(
    (fileId) => !existingFileIds.has(fileId)
  )
  const fileIdsToUnlink = [...existingFileIds].filter(
    (fileId) => !nextFileIds.has(fileId)
  )

  try {
    for (const fileId of fileIdsToLink) {
      await linkKnowledgeBaseFileToAgent(adminUser.id, {
        fileId,
        agentId: parsed.data.agentId,
      })

      await recordKnowledgeBaseAuditEvent({
        eventKey: crypto.randomUUID(),
        userId: adminUser.id,
        action: "knowledge_base_link",
        fileId,
        agentId: parsed.data.agentId,
        sourceSurface: "admin",
      })
    }

    for (const fileId of fileIdsToUnlink) {
      await unlinkKnowledgeBaseFileFromAgent(adminUser.id, {
        fileId,
        agentId: parsed.data.agentId,
      })

      await recordKnowledgeBaseAuditEvent({
        eventKey: crypto.randomUUID(),
        userId: adminUser.id,
        action: "knowledge_base_unlink",
        fileId,
        agentId: parsed.data.agentId,
        sourceSurface: "admin",
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update links",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    linkedCount: selectedFileIds.length,
  })
}
