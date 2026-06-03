import { generateText, type UIMessage } from "ai"
import { resolveGatewayProviderContext } from "@/lib/ai-provider"
import {
  DEFAULT_CHAT_MODEL_ID,
  resolveGatewayFallbackModelIds,
  resolveGatewayModelId,
} from "@/lib/models"
import { createServiceClient } from "@/lib/supabase/service"
import type { KnowledgeBaseFile } from "@/lib/db/knowledge-base"
import { updateKnowledgeBaseFileSummary } from "@/lib/db/knowledge-base"

const SUMMARY_MODEL_ID = DEFAULT_CHAT_MODEL_ID
const LARGE_FILE_THRESHOLD_BYTES = 512 * 1024
const MAX_KB_CONTEXT_TOKENS = 16_000
const MAX_LINKED_KB_FILES_PER_TURN = 5
const MAX_SUMMARY_OUTPUT_TOKENS = 1_800

type KBFilePart = Extract<UIMessage["parts"][number], { type: "file" }>

function estimateTextTokens(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.max(1, Math.ceil(trimmed.length / 4))
}

function estimateFileTokens(sizeBytes: number): number {
  return Math.max(400, Math.ceil(sizeBytes / 6))
}

function estimatePartTokens(
  part: UIMessage["parts"][number],
  fileSizeBytes?: number
): number {
  if (part.type === "text") {
    return estimateTextTokens(part.text)
  }

  return estimateFileTokens(fileSizeBytes ?? 0)
}

async function getSignedFileUrl(
  file: KnowledgeBaseFile
): Promise<string | null> {
  const service = createServiceClient()
  const { data, error } = await service.storage
    .from(file.bucket)
    .createSignedUrl(file.storage_path, 60 * 60)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

export async function ensureKnowledgeBaseSummary(
  file: KnowledgeBaseFile
): Promise<string | null> {
  const existingSummary = file.summary_text?.trim()
  if (existingSummary) {
    return existingSummary
  }

  if (file.mime_type !== "application/pdf") {
    return null
  }

  if (file.size_bytes < LARGE_FILE_THRESHOLD_BYTES) {
    return null
  }

  const signedUrl = await getSignedFileUrl(file)
  if (!signedUrl) {
    return null
  }

  const providerContext = resolveGatewayProviderContext({
    gatewayModelId: resolveGatewayModelId(SUMMARY_MODEL_ID),
    fallbackGatewayModelIds: resolveGatewayFallbackModelIds(SUMMARY_MODEL_ID),
  })

  const summaryResult = await generateText({
    model: providerContext.languageModel,
    providerOptions: providerContext.gatewayProviderOptions
      ? {
          gateway: providerContext.gatewayProviderOptions,
        }
      : undefined,
    maxRetries: 2,
    timeout: 120_000,
    maxOutputTokens: MAX_SUMMARY_OUTPUT_TOKENS,
    system:
      "You summarise audit knowledge-base documents for downstream agent use. Be concise, faithful, and specific. Do not invent facts or use filler.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Summarise the attached document "${file.name}" for later agent reasoning. Produce a compact but information-dense briefing with these sections: Overview, Key Topics, Important Definitions, Notable Rules or Exceptions, Search Terms, and Likely Question Areas. Keep the response under 1,200 words.`,
          },
          {
            type: "file",
            mediaType: file.mime_type,
            filename: file.name,
            data: signedUrl,
          },
        ],
      },
    ],
  })

  const summaryText = summaryResult.text.trim()
  if (!summaryText) {
    return null
  }

  await updateKnowledgeBaseFileSummary({
    fileId: file.id,
    summaryText,
    summaryModel: SUMMARY_MODEL_ID,
  })

  return summaryText
}

async function buildRawFilePart(
  file: KnowledgeBaseFile
): Promise<UIMessage["parts"][number] | null> {
  const signedUrl = await getSignedFileUrl(file)
  if (!signedUrl) {
    return null
  }

  return {
    type: "file",
    filename: file.name,
    mediaType: file.mime_type,
    url: signedUrl,
    providerMetadata: {
      vera: {
        attachmentType: "pdf",
        storagePath: file.storage_path,
        bucket: file.bucket,
        size: file.size_bytes,
        source: "knowledge-base",
      },
    },
  }
}

export async function buildKnowledgeBaseContextParts(
  files: KnowledgeBaseFile[]
): Promise<UIMessage["parts"]> {
  if (!files.length) return []

  const selectedParts: UIMessage["parts"] = []
  let totalTokens = 0

  const sortedFiles = [...files].sort(
    (left, right) => right.size_bytes - left.size_bytes
  )

  for (const file of sortedFiles) {
    if (selectedParts.length >= MAX_LINKED_KB_FILES_PER_TURN) {
      break
    }

    let nextPart: UIMessage["parts"][number] | null = null
    const summaryText =
      file.summary_text?.trim() ||
      (file.size_bytes >= LARGE_FILE_THRESHOLD_BYTES
        ? await ensureKnowledgeBaseSummary(file)
        : null)

    if (summaryText) {
      nextPart = {
        type: "text",
        text: `Knowledge-base document summary for "${file.name}":\n\n${summaryText}`,
      }
    } else {
      nextPart = await buildRawFilePart(file)
    }

    if (!nextPart) {
      continue
    }

    const nextTokens = estimatePartTokens(nextPart, file.size_bytes)
    if (totalTokens + nextTokens > MAX_KB_CONTEXT_TOKENS) {
      continue
    }

    selectedParts.push(nextPart)
    totalTokens += nextTokens
  }

  return selectedParts
}

export function estimateKnowledgeBaseContextTokens(
  parts: UIMessage["parts"]
): number {
  return parts.reduce((total, part) => {
    if (part.type === "text") {
      return total + estimateTextTokens(part.text)
    }

    const filePart = part as KBFilePart
    const size = (
      filePart.providerMetadata as { vera?: { size?: number } } | undefined
    )?.vera?.size

    return total + estimateFileTokens(size ?? 0)
  }, 0)
}

export { trimMessagesToTokenBudget } from "./chat-context-budget"
