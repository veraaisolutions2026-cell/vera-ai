import type { UIMessage } from "ai"
import type { Json } from "@/types/supabase"

export const CHAT_ATTACHMENTS_BUCKET = "chat-attachments"

export type ChatAttachment = {
  type: "pdf" | "docx"
  name: string
  mimeType: string
  size: number
  storagePath: string
  signedUrl: string
  text?: string
}

export type VeraAttachmentMetadata = {
  attachmentType: "pdf" | "docx"
  storagePath: string
  extractedText?: string | null
  size: number
}

export type PersistedProviderMetadata = {
  [key: string]: { [key: string]: Json }
}

export type PersistedTextPart = {
  type: "text"
  text: string
}

export type PersistedFilePart = {
  type: "file"
  filename?: string
  mediaType: string
  url: string
  providerMetadata?: PersistedProviderMetadata
}

export type PersistedMessagePart = PersistedTextPart | PersistedFilePart
export type PersistedMessageParts = PersistedMessagePart[]

export type ChatMessageAttachment = {
  id: string
  type: "file"
  filename?: string
  url: string
  mediaType: string
}

function getAttachmentFallbackText(attachments: ChatAttachment[]): string {
  if (attachments.length === 0) return ""
  if (attachments.length === 1) {
    return `Please review the attached document: ${attachments[0]!.name}.`
  }

  return `Please review the attached documents: ${attachments
    .map((attachment) => attachment.name)
    .join(", ")}.`
}

export function extractTextFromMessageParts(
  parts: PersistedMessageParts
): string {
  let text = ""

  for (const part of parts) {
    if (part.type === "text") {
      text += part.text
    }
  }

  return text.trim()
}

export function buildAttachmentFileParts(
  attachments: ChatAttachment[]
): PersistedFilePart[] {
  return attachments.map((attachment) => ({
    type: "file",
    filename: attachment.name,
    mediaType: attachment.mimeType,
    url: attachment.signedUrl,
    providerMetadata: {
      vera: {
        attachmentType: attachment.type,
        storagePath: attachment.storagePath,
        extractedText: attachment.text ?? null,
        size: attachment.size,
      },
    },
  }))
}

export function buildUserMessageParts(
  text: string,
  attachments: ChatAttachment[]
): PersistedMessageParts {
  const normalizedText = text.trim() || getAttachmentFallbackText(attachments)
  const textParts: PersistedMessageParts = normalizedText
    ? [{ type: "text", text: normalizedText }]
    : []

  return [...textParts, ...buildAttachmentFileParts(attachments)]
}

export function extractAttachmentsFromMessageParts(
  parts: UIMessage["parts"]
): ChatMessageAttachment[] {
  return parts.flatMap((part, index) => {
    if (part.type !== "file") return []

    return [
      {
        id: `${part.filename ?? "attachment"}-${index}`,
        type: "file" as const,
        filename: part.filename,
        url: part.url,
        mediaType: part.mediaType,
      },
    ]
  })
}

export function getVeraAttachmentMetadata(
  part: PersistedFilePart
): VeraAttachmentMetadata | null {
  const providerMetadata = part.providerMetadata
  if (!providerMetadata || typeof providerMetadata !== "object") return null

  const veraMetadata = (providerMetadata as Record<string, unknown>).vera
  if (!veraMetadata || typeof veraMetadata !== "object") return null

  const attachmentType =
    (veraMetadata as Record<string, unknown>).attachmentType === "pdf"
      ? "pdf"
      : (veraMetadata as Record<string, unknown>).attachmentType === "docx"
        ? "docx"
        : null
  const storagePath = (veraMetadata as Record<string, unknown>).storagePath
  const extractedText = (veraMetadata as Record<string, unknown>).extractedText
  const size = (veraMetadata as Record<string, unknown>).size

  if (!attachmentType || typeof storagePath !== "string") return null

  return {
    attachmentType,
    storagePath,
    extractedText: typeof extractedText === "string" ? extractedText : null,
    size: typeof size === "number" ? size : 0,
  }
}

export function parseStoredMessageParts(
  value: Json | null | undefined
): PersistedMessageParts | null {
  if (!Array.isArray(value)) return null

  const parts: PersistedMessageParts = []

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue

    const record = item as Record<string, Json | undefined>

    if (record.type === "text" && typeof record.text === "string") {
      parts.push({ type: "text", text: record.text })
      continue
    }

    if (
      record.type === "file" &&
      typeof record.mediaType === "string" &&
      typeof record.url === "string"
    ) {
      parts.push({
        type: "file",
        mediaType: record.mediaType,
        url: record.url,
        filename:
          typeof record.filename === "string" ? record.filename : undefined,
        providerMetadata:
          record.providerMetadata &&
          typeof record.providerMetadata === "object" &&
          !Array.isArray(record.providerMetadata)
            ? (record.providerMetadata as PersistedProviderMetadata)
            : undefined,
      })
    }
  }

  return parts.length > 0 ? parts : null
}

export function toPersistedMessageParts(
  parts: UIMessage["parts"] | null | undefined
): PersistedMessageParts | null {
  if (!parts?.length) return null

  const persistedParts: PersistedMessageParts = []

  for (const part of parts) {
    if (part.type === "text") {
      persistedParts.push({ type: "text", text: part.text })
      continue
    }

    if (part.type !== "file") continue

    const providerMetadata =
      part.providerMetadata && typeof part.providerMetadata === "object"
        ? (JSON.parse(
            JSON.stringify(part.providerMetadata)
          ) as PersistedProviderMetadata)
        : undefined

    persistedParts.push({
      type: "file",
      filename: part.filename,
      mediaType: part.mediaType,
      url: part.url,
      providerMetadata,
    })
  }

  return persistedParts.length > 0 ? persistedParts : null
}
