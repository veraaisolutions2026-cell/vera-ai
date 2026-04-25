"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  createKnowledgeBaseFile,
  deleteKnowledgeBaseFile,
  linkKnowledgeBaseFileToAgent,
  unlinkKnowledgeBaseFileFromAgent,
} from "@/lib/db/knowledge-base"
import { recordKnowledgeBaseAuditEvent } from "@/lib/db/usage-events"

const kbUploadSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().min(1),
  fileType: z.literal("application/pdf"),
})

const kbFileActionSchema = z.object({
  fileId: z.string().uuid(),
})

const kbLinkActionSchema = z.object({
  fileId: z.string().uuid(),
  agentId: z.string().uuid(),
})

const kbSetLinksSchema = z.object({
  agentId: z.string().uuid(),
  fileIds: z.array(z.string().uuid()).default([]),
})

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
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

function refreshAdminKnowledgeBaseViews(): void {
  revalidatePath("/admin/vera-intelligence")
  revalidatePath("/admin/vera-intelligence/knowledge-base")
  revalidatePath("/admin/vera-intelligence/agent-linking")
}

export async function uploadKnowledgeBasePdfAction(
  formData: FormData
): Promise<void> {
  const userId = await assertAdminUser()
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided")
  }

  const payload = kbUploadSchema.safeParse({
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  })

  if (!payload.success) {
    throw new Error(payload.error.issues[0]?.message ?? "Invalid PDF upload")
  }

  const safeName = sanitizeFileName(payload.data.fileName)
  const timestamp = Date.now()
  const storagePath = `admin/${userId}/${timestamp}-${safeName}`

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from("knowledge-base-files")
    .upload(storagePath, file, {
      upsert: false,
      contentType: "application/pdf",
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const created = await createKnowledgeBaseFile(userId, {
    name: payload.data.fileName,
    mimeType: "application/pdf",
    sizeBytes: payload.data.fileSize,
    storagePath,
    scope: "admin",
    ownerUserId: null,
  })

  await recordKnowledgeBaseAuditEvent({
    eventKey: crypto.randomUUID(),
    userId,
    action: "knowledge_base_upload",
    fileId: created.id,
    sourceSurface: "admin",
    metadata: {
      scope: "admin",
      fileName: created.name,
      sizeBytes: created.size_bytes,
    },
  })

  refreshAdminKnowledgeBaseViews()
}

export async function deleteKnowledgeBaseFileAction(
  formData: FormData
): Promise<void> {
  const userId = await assertAdminUser()

  const parsed = kbFileActionSchema.safeParse({
    fileId: formData.get("fileId"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid file id")
  }

  const service = createServiceClient()
  const { data: file, error } = await service
    .from("knowledge_base_files")
    .select("bucket, storage_path")
    .eq("id", parsed.data.fileId)
    .single()

  if (error || !file) {
    throw new Error("File not found")
  }

  await deleteKnowledgeBaseFile(userId, parsed.data.fileId)

  await recordKnowledgeBaseAuditEvent({
    eventKey: crypto.randomUUID(),
    userId,
    action: "knowledge_base_delete",
    fileId: parsed.data.fileId,
    sourceSurface: "admin",
    metadata: {
      bucket: file.bucket,
      storagePath: file.storage_path,
    },
  })

  const { error: removeError } = await service.storage
    .from(file.bucket)
    .remove([file.storage_path])

  if (removeError) {
    throw new Error(removeError.message)
  }

  refreshAdminKnowledgeBaseViews()
}

export async function linkKnowledgeBaseFileToAgentAction(
  formData: FormData
): Promise<void> {
  const userId = await assertAdminUser()

  const parsed = kbLinkActionSchema.safeParse({
    fileId: formData.get("fileId"),
    agentId: formData.get("agentId"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid link payload")
  }

  await linkKnowledgeBaseFileToAgent(userId, {
    fileId: parsed.data.fileId,
    agentId: parsed.data.agentId,
  })

  await recordKnowledgeBaseAuditEvent({
    eventKey: crypto.randomUUID(),
    userId,
    action: "knowledge_base_link",
    fileId: parsed.data.fileId,
    agentId: parsed.data.agentId,
    sourceSurface: "admin",
  })

  refreshAdminKnowledgeBaseViews()
}

export async function unlinkKnowledgeBaseFileFromAgentAction(
  formData: FormData
): Promise<void> {
  const userId = await assertAdminUser()

  const parsed = kbLinkActionSchema.safeParse({
    fileId: formData.get("fileId"),
    agentId: formData.get("agentId"),
  })

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid unlink payload")
  }

  await unlinkKnowledgeBaseFileFromAgent(userId, {
    fileId: parsed.data.fileId,
    agentId: parsed.data.agentId,
  })

  await recordKnowledgeBaseAuditEvent({
    eventKey: crypto.randomUUID(),
    userId,
    action: "knowledge_base_unlink",
    fileId: parsed.data.fileId,
    agentId: parsed.data.agentId,
    sourceSurface: "admin",
  })

  refreshAdminKnowledgeBaseViews()
}

export async function setKnowledgeBaseLinksForAgentAction(
  formData: FormData
): Promise<void> {
  const userId = await assertAdminUser()

  const parsed = kbSetLinksSchema.safeParse({
    agentId: formData.get("agentId"),
    fileIds: formData.getAll("fileIds"),
  })

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid link selection payload"
    )
  }

  const selectedFileIds = Array.from(new Set(parsed.data.fileIds))
  const service = createServiceClient()
  const { data: existingLinks, error: linksError } = await service
    .from("agent_knowledge_base_files")
    .select("file_id")
    .eq("agent_id", parsed.data.agentId)

  if (linksError) {
    throw new Error(linksError.message)
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

  for (const fileId of fileIdsToLink) {
    await linkKnowledgeBaseFileToAgent(userId, {
      fileId,
      agentId: parsed.data.agentId,
    })

    await recordKnowledgeBaseAuditEvent({
      eventKey: crypto.randomUUID(),
      userId,
      action: "knowledge_base_link",
      fileId,
      agentId: parsed.data.agentId,
      sourceSurface: "admin",
    })
  }

  for (const fileId of fileIdsToUnlink) {
    await unlinkKnowledgeBaseFileFromAgent(userId, {
      fileId,
      agentId: parsed.data.agentId,
    })

    await recordKnowledgeBaseAuditEvent({
      eventKey: crypto.randomUUID(),
      userId,
      action: "knowledge_base_unlink",
      fileId,
      agentId: parsed.data.agentId,
      sourceSurface: "admin",
    })
  }

  refreshAdminKnowledgeBaseViews()
}
