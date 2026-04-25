import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createKnowledgeBaseFile,
  linkKnowledgeBaseFileToAgent,
} from "@/lib/db/knowledge-base"
import { getUserLayerAccess } from "@/lib/db/layer-access"
import { recordKnowledgeBaseAuditEvent } from "@/lib/db/usage-events"

const MAX_FILE_SIZE = 40 * 1024 * 1024

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function isForbiddenError(error: unknown): boolean {
  return error instanceof Error && error.message === "Forbidden"
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const layerAccess = await getUserLayerAccess(user.id)
  if (
    layerAccess.role !== "admin" &&
    !layerAccess.allowKnowledgeBaseManagement
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are supported" },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 40 MB." },
      { status: 400 }
    )
  }

  const { id: agentId } = await params
  const safeName = sanitizeFileName(file.name)
  const storagePath = `${layerAccess.role === "admin" ? "admin" : "user"}/${user.id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(storagePath, file, {
      upsert: false,
      contentType: "application/pdf",
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  try {
    const created = await createKnowledgeBaseFile(user.id, {
      name: file.name,
      mimeType: "application/pdf",
      sizeBytes: file.size,
      storagePath,
      scope: layerAccess.role === "admin" ? "admin" : "user",
      ownerUserId: layerAccess.role === "admin" ? null : user.id,
    })

    await linkKnowledgeBaseFileToAgent(user.id, {
      agentId,
      fileId: created.id,
    })

    await recordKnowledgeBaseAuditEvent({
      eventKey: crypto.randomUUID(),
      userId: user.id,
      action: "knowledge_base_upload",
      fileId: created.id,
      agentId,
      sourceSurface: "dashboard",
      metadata: {
        scope: created.scope,
        fileName: created.name,
        sizeBytes: created.size_bytes,
      },
    })

    await recordKnowledgeBaseAuditEvent({
      eventKey: crypto.randomUUID(),
      userId: user.id,
      action: "knowledge_base_link",
      fileId: created.id,
      agentId,
      sourceSurface: "dashboard",
      metadata: {
        linkedVia: "upload",
      },
    })

    return NextResponse.json({
      fileId: created.id,
      name: created.name,
      sizeBytes: created.size_bytes,
      mimeType: created.mime_type,
      linked: true,
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
