import mammoth from "mammoth"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  CHAT_ATTACHMENTS_BUCKET,
  type ChatAttachment,
} from "@/lib/chat-attachments"

export const maxDuration = 30

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

const MAX_FILE_SIZE = 40 * 1024 * 1024 // 40 MB

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-")
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: "Only PDF and DOCX documents are supported" },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum size is 40 MB." },
      { status: 400 }
    )
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const serviceSupabase = createServiceClient()
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`

  const { error: uploadError } = await serviceSupabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    const message = uploadError.message.toLowerCase().includes("bucket")
      ? `Storage bucket "${CHAT_ATTACHMENTS_BUCKET}" is not configured. Run the attachment SQL setup and retry.`
      : "Failed to upload attachment"

    return Response.json({ error: message }, { status: 500 })
  }

  const { data: signedUrlData, error: signedUrlError } =
    await serviceSupabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return Response.json(
      { error: "Failed to prepare attachment for analysis" },
      { status: 500 }
    )
  }

  const baseAttachment: Omit<ChatAttachment, "type"> = {
    name: file.name,
    mimeType: file.type,
    size: file.size,
    storagePath: path,
    signedUrl: signedUrlData.signedUrl,
  }

  if (file.type === "application/pdf") {
    return Response.json({
      type: "pdf",
      ...baseAttachment,
    } satisfies ChatAttachment)
  }

  const result = await mammoth.extractRawText({ buffer })
  const text = result.value.trim()

  if (!text) {
    return Response.json(
      { error: "Could not extract text from the document" },
      { status: 422 }
    )
  }

  return Response.json({
    type: "docx",
    ...baseAttachment,
    text,
  } satisfies ChatAttachment)
}
