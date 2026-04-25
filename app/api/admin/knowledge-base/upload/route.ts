import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createKnowledgeBaseFile } from "@/lib/db/knowledge-base"
import { recordKnowledgeBaseAuditEvent } from "@/lib/db/usage-events"

const MAX_FILE_SIZE = 40 * 1024 * 1024

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

async function assertAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, error: "Unauthorized" as const }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { user: null, error: "Forbidden" as const }
  }

  return { user, error: null }
}

export async function POST(request: Request) {
  const auth = await assertAdminUser()
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file selected." }, { status: 400 })
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are supported." },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 40 MB." },
      { status: 400 }
    )
  }

  const safeName = sanitizeFileName(file.name)
  const storagePath = `admin/${auth.user.id}/${Date.now()}-${safeName}`

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(storagePath, file, {
      upsert: false,
      contentType: "application/pdf",
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const created = await createKnowledgeBaseFile(auth.user.id, {
    name: file.name,
    mimeType: "application/pdf",
    sizeBytes: file.size,
    storagePath,
    scope: "admin",
    ownerUserId: null,
  })

  await recordKnowledgeBaseAuditEvent({
    eventKey: crypto.randomUUID(),
    userId: auth.user.id,
    action: "knowledge_base_upload",
    fileId: created.id,
    sourceSurface: "admin",
    metadata: {
      scope: "admin",
      fileName: created.name,
      sizeBytes: created.size_bytes,
    },
  })

  return NextResponse.json({
    id: created.id,
    name: created.name,
    sizeBytes: created.size_bytes,
    mimeType: created.mime_type,
  })
}
