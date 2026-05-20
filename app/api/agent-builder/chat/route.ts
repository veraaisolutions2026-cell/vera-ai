import { devToolsMiddleware } from "@ai-sdk/devtools"
import {
  streamText,
  convertToModelMessages,
  wrapLanguageModel,
  type UIMessage,
} from "ai"
import { z } from "zod"
import {
  buildAIUsageMetadata,
  createAIRequestTimingTracker,
} from "@/lib/ai-observability"
import { createClient } from "@/lib/supabase/server"
import { recordUsageEvent } from "@/lib/db/usage-events"
import { getResolvedAcaPrompt } from "@/lib/aca-prompt"
import { DEFAULT_ACA_PROMPT } from "@/lib/default-aca-prompt"
import { getUsageAvailability } from "@/lib/db/usage-limits"
import { resolveAnthropicProviderContext } from "@/lib/ai-provider"
import {
  normalizeModelId,
  resolveGatewayModelId,
  resolveModelId,
} from "@/lib/models"

export const maxDuration = 60
const AI_DEVTOOLS_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.VERA_ENABLE_AI_DEVTOOLS !== "false"

const STREAM_RESPONSE_HEADERS = {
  "Transfer-Encoding": "chunked",
  Connection: "keep-alive",
  "Content-Encoding": "none",
} as const

const NO_EMOJI_SUFFIX =
  "\n\nIMPORTANT: Never use emoji characters in your responses. Use clear, professional language only."

const TRAVERS_IDENTITY =
  "\n\nYou are Travers, an AI agent architect built by Vera AI. If anyone asks who you are, introduce yourself as Travers — not Claude, not any other AI product. Explain that you are Travers, the agent design assistant inside Vera AI."

const AGENT_BUILDER_MODEL_ID = "claude-sonnet-4.6"
const AGENT_BASE_MODEL_IDS = ["claude-sonnet-4.6", "claude-haiku-4.5"] as const

function getTextFromParts(parts: UIMessage["parts"]): string {
  let text = ""

  for (const part of parts) {
    if (part.type === "text") {
      text += part.text
    }
  }

  return text
}

function shouldForceCreateAgentTool(latestUserText: string): boolean {
  const prompt = latestUserText.trim().toLowerCase()

  if (!prompt) return false

  const requestsImmediateSave =
    prompt.includes("call the create_agent tool") ||
    prompt.includes("create and save") ||
    prompt.includes("save the agent") ||
    prompt.includes("do not ask follow-up")

  const hasStructuredAgentFields =
    prompt.includes("name:") &&
    prompt.includes("description:") &&
    prompt.includes("category:") &&
    prompt.includes("model:")

  return requestsImmediateSave && hasStructuredAgentFields
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const usageAvailability = await getUsageAvailability(user.id)
  if (!usageAvailability.isAvailable) {
    return Response.json(
      {
        error: "out_of_usage",
        remainingRequests: usageAvailability.remainingRequests,
        monthlyRequestLimit: usageAvailability.monthlyRequestLimit,
      },
      {
        status: 402,
        headers: {
          "x-vera-turn-state": "out-of-usage",
        },
      }
    )
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] }
  if (!messages?.length) {
    return new Response("Bad request", { status: 400 })
  }

  const acaPrompt = (await getResolvedAcaPrompt()).value
  const systemPrompt =
    (acaPrompt ?? DEFAULT_ACA_PROMPT) + TRAVERS_IDENTITY + NO_EMOJI_SUFFIX
  const agentBuilderModelId = normalizeModelId(AGENT_BUILDER_MODEL_ID)
  const directModelId = resolveModelId(agentBuilderModelId)
  const gatewayModelId = resolveGatewayModelId(agentBuilderModelId)
  const providerContext = resolveAnthropicProviderContext({
    directModelId,
    gatewayModelId,
  })
  const timingTracker = createAIRequestTimingTracker()
  const languageModel = AI_DEVTOOLS_ENABLED
    ? wrapLanguageModel({
        model: providerContext.languageModel,
        middleware: devToolsMiddleware(),
      })
    : providerContext.languageModel
  const usageEventKey = crypto.randomUUID()
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const latestUserText = latestUserMessage
    ? getTextFromParts(latestUserMessage.parts).trim()
    : ""
  const forceCreateAgentTool = shouldForceCreateAgentTool(latestUserText)

  const result = streamText({
    // Anthropic can return transient overload responses; retry to keep UX stable.
    maxRetries: 4,
    model: languageModel,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    toolChoice: forceCreateAgentTool
      ? { type: "tool", toolName: "create_agent" }
      : undefined,
    abortSignal: req.signal,
    onChunk: ({ chunk }) => {
      timingTracker.observeChunk(chunk.type)
    },
    tools: {
      create_agent: {
        description:
          "Create and save a complete AI agent to the user's account. Call this once you have gathered enough information. The agent is immediately saved and ready to use — no further action needed from the user.",
        inputSchema: z.object({
          name: z
            .string()
            .describe("Display name, e.g. 'IFRS Compliance Reviewer'"),
          icon: z
            .string()
            .describe(
              "Lucide icon name. Choose from: Bot, Scale, FileText, Shield, Calculator, BookOpen, TrendingUp, AlertTriangle, Briefcase, Building2, ClipboardList, CheckSquare, Database, Globe, Layers, MessageSquare, Users, BarChart2, DollarSign, Lock, FileSearch, FileCheck, ShieldCheck, Target, Brain, FileBarChart, AlertCircle, ClipboardCheck, Coins, Percent"
            ),
          description: z
            .string()
            .describe(
              "Short one-line description shown in the agent selector, max 100 characters"
            ),
          category: z
            .string()
            .describe(
              "Category: Audit, Tax, Compliance, Finance, Advisory, Risk, etc."
            ),
          system_prompt: z
            .string()
            .describe(
              "Complete structured system prompt using the §0-§5 scaffold"
            ),
          base_model: z
            .enum(AGENT_BASE_MODEL_IDS)
            .describe(
              "Model: sonnet for complex reasoning tasks, haiku for fast/simple tasks"
            ),
        }),
        execute: async ({
          name,
          icon,
          description,
          category,
          system_prompt,
          base_model,
        }) => {
          const normalizedBaseModel = normalizeModelId(base_model)
          const { data: agent, error } = await supabase
            .from("agents")
            .insert({
              name,
              icon,
              description,
              category,
              system_prompt,
              base_model: normalizedBaseModel,
              user_id: user.id,
              is_builtin: false,
            })
            .select("id")
            .single()

          if (error) return { success: false, error: error.message }

          return {
            success: true,
            agent_id: agent.id,
            name,
            icon,
            description,
            category,
            system_prompt,
            base_model: normalizedBaseModel,
          }
        },
      },
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    headers: STREAM_RESPONSE_HEADERS,
    onFinish: async ({ messages: resultMessages }) => {
      const timing = timingTracker.snapshot()
      const assistantText = resultMessages
        .filter((message) => message.role === "assistant")
        .map((message) => getTextFromParts(message.parts).trim())
        .filter(Boolean)
        .at(-1)

      if (!assistantText) return

      await recordUsageEvent({
        eventKey: usageEventKey,
        userId: user.id,
        source: "agent-builder",
        model: agentBuilderModelId,
        requestTrigger: "submit-message",
        userMessageChars: latestUserText.length,
        assistantMessageChars: assistantText.length,
        metadata: buildAIUsageMetadata({
          configuredProviderMode: providerContext.configuredProviderMode,
          resolvedProviderMode: providerContext.resolvedProviderMode,
          availability: providerContext.availability,
          inputModelId: agentBuilderModelId,
          canonicalModelId: agentBuilderModelId,
          directModelId,
          gatewayModelId,
          timing,
        }),
      })
    },
  })
}
