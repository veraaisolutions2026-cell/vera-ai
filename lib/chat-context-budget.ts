import type { UIMessage } from "ai"

function estimateTextTokens(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.max(1, Math.ceil(trimmed.length / 4))
}

function estimateFileTokens(sizeBytes: number): number {
  return Math.max(400, Math.ceil(sizeBytes / 6))
}

function estimateMessageTokens(message: UIMessage): number {
  return message.parts.reduce((total, part) => {
    if (part.type === "text") {
      return total + estimateTextTokens(part.text)
    }

    const metadata = (
      part as {
        providerMetadata?: {
          vera?: { size?: number; extractedText?: string | null }
        }
      }
    ).providerMetadata?.vera

    if (metadata?.extractedText?.trim()) {
      return total + estimateTextTokens(metadata.extractedText)
    }

    return total + estimateFileTokens(metadata?.size ?? 0)
  }, 0)
}

export function trimMessagesToTokenBudget(
  messages: UIMessage[],
  maxTokens = 90_000
): UIMessage[] {
  if (messages.length === 0) return messages

  let startIndex = 0
  let remaining = messages.slice(startIndex)

  while (remaining.length > 1) {
    const totalTokens = remaining.reduce(
      (sum, message) => sum + estimateMessageTokens(message),
      0
    )

    if (totalTokens <= maxTokens) {
      return remaining
    }

    startIndex += 1
    remaining = messages.slice(startIndex)
  }

  return remaining
}
