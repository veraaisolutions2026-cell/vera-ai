import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  linkKnowledgeBaseFileToAgent,
  listAgentKnowledgeBaseLinks,
  listKnowledgeBaseFiles,
  unlinkKnowledgeBaseFileFromAgent,
} from "@/lib/db/knowledge-base"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { createServiceClient } from "@/lib/supabase/service"
import { recordKnowledgeBaseAuditEvent } from "@/lib/db/usage-events"

const linkSchema = z.object({
  fileId: z.string().uuid(),
})

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

function isForbiddenError(error: unknown): boolean {
  return error instanceof Error && error.message === "Forbidden"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: agentId } = await params

  try {
    const layerAccess = await getUserLayerAccess(user.id)

    const [availableFiles, links] = await Promise.all([
      listKnowledgeBaseFiles(
        user.id,
        layerAccess.role === "admin" ? { scope: "admin" } : { scope: "user" }
      ),
      listAgentKnowledgeBaseLinks(user.id, agentId),
    ])

    const linkedFileIds = links.map((link) => link.file_id)
    const service = createServiceClient()

    const linkedFilesResult = linkedFileIds.length
      ? await service
          .from("knowledge_base_files")
          .select("id, name, size_bytes, mime_type, created_at")
          .in("id", linkedFileIds)
      : { data: [], error: null }

    if (linkedFilesResult.error) {
      return NextResponse.json(
        { error: linkedFilesResult.error.message },
        { status: 500 }
      )
    }

    const linkedRows = linkedFilesResult.data ?? []
    const linkedById = new Map(linkedRows.map((file) => [file.id, file]))

    const linkedFiles = links
      .map((link) => {
        const file = linkedById.get(link.file_id)
        if (!file) return null

        return {
          fileId: file.id,
          name: file.name,
          sizeBytes: file.size_bytes,
          mimeType: file.mime_type,
          linkedAt: link.created_at,
        }
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value))

    return NextResponse.json({
      availableFiles: availableFiles.map((file) => ({
        id: file.id,
        name: file.name,
        sizeBytes: file.size_bytes,
        mimeType: file.mime_type,
        scope: file.scope,
        createdAt: file.created_at,
      })),
      linkedFiles,
    })
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: agentId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    )
  }

  try {
    await linkKnowledgeBaseFileToAgent(user.id, {
      agentId,
      fileId: parsed.data.fileId,
    })

    await recordKnowledgeBaseAuditEvent({
      eventKey: crypto.randomUUID(),
      userId: user.id,
      action: "knowledge_base_link",
      fileId: parsed.data.fileId,
      agentId,
      sourceSurface: "dashboard",
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: agentId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    )
  }

  try {
    await unlinkKnowledgeBaseFileFromAgent(user.id, {
      agentId,
      fileId: parsed.data.fileId,
    })

    await recordKnowledgeBaseAuditEvent({
      eventKey: crypto.randomUUID(),
      userId: user.id,
      action: "knowledge_base_unlink",
      fileId: parsed.data.fileId,
      agentId,
      sourceSurface: "dashboard",
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isForbiddenError(error)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
