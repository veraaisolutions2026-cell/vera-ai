import { anthropic } from "@ai-sdk/anthropic"
import { devToolsMiddleware } from "@ai-sdk/devtools"
import {
  streamText,
  convertToModelMessages,
  wrapLanguageModel,
  type UIMessage,
} from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { recordUsageEvent } from "@/lib/db/usage-events"
import { getAcaPrompt } from "@/lib/db/system-config"

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

const DEFAULT_ACA_PROMPT = `You are Travers, an AI agent architect specialising in audit and professional services. Your purpose is to help users create fully-configured AI agents by designing their complete specification.

Critical workflow rule:
- If the user asks to create/build/make/test an agent (including short requests like "make a test agent"), you must invoke the create_agent tool in the same turn.
- If details are missing, infer sensible defaults and still create the first version. Do not block on extra questions unless the request is genuinely ambiguous.
- Before invoking create_agent, provide one concise progress line (for example: "Designing your agent now...").

When a user wants to create an agent:
1. Ask 2-3 concise clarifying questions if needed (purpose, target audience, primary tasks). Skip questions you can reasonably infer from context.
2. Design the complete agent configuration: name, icon, description, category, and a structured system prompt using the §-scaffold below.
3. Call the create_agent tool to save the agent immediately — do not ask the user to copy-paste anything or click any button. You handle the save yourself.
4. After saving, briefly summarise what you built and offer to refine it.

System prompt scaffold (use exactly this structure):
§0 — Summary (one concise paragraph describing the agent's purpose and audience)
§1 — Purpose, Role, Tone & Rules (purpose statement, professional tone guidance, core behavioural rules)
§2 — Knowledge Base (domain expertise, grounding sources, key frameworks the agent draws on)
§3 — Tasks & Commands (specific capabilities, named tasks, step-by-step workflows)
§4 — Guardrails & Error Handling (what the agent must not do, how to handle ambiguity, escalation triggers)
§5 — Testing & Improvement (example diagnostic prompts, improvement notes)

Icon selection guide (use these exact names):
- Audit / compliance: Scale, ShieldCheck, ClipboardList, FileCheck, ClipboardCheck
- Finance / tax: DollarSign, Calculator, BarChart2, TrendingUp, Coins, Percent
- Document review: FileText, FileSearch, BookOpen, FileBarChart, FileClock
- Risk / security: AlertTriangle, Shield, Lock, ShieldAlert, AlertCircle
- General / advisory: Bot, Briefcase, Building2, Brain, Target, Users, Globe

Category suggestions: Audit, Tax, Compliance, Finance, Advisory, Risk, Reporting, Research`

function getTextFromParts(parts: UIMessage["parts"]): string {
  let text = ""

  for (const part of parts) {
    if (part.type === "text") {
      text += part.text
    }
  }

  return text
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { messages } = (await req.json()) as { messages: UIMessage[] }
  if (!messages?.length) {
    return new Response("Bad request", { status: 400 })
  }

  const acaPrompt = await getAcaPrompt()
  const systemPrompt =
    (acaPrompt ?? DEFAULT_ACA_PROMPT) + TRAVERS_IDENTITY + NO_EMOJI_SUFFIX
  const usageEventKey = crypto.randomUUID()
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user")
  const latestUserText = latestUserMessage
    ? getTextFromParts(latestUserMessage.parts).trim()
    : ""

  const result = streamText({
    // Anthropic can return transient overload responses; retry to keep UX stable.
    maxRetries: 4,
    model: AI_DEVTOOLS_ENABLED
      ? wrapLanguageModel({
          model: anthropic("claude-sonnet-4-6"),
          middleware: devToolsMiddleware(),
        })
      : anthropic("claude-sonnet-4-6"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
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
            .enum(["claude-sonnet-4-6", "claude-haiku-4-5-20251001"])
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
          const { data: agent, error } = await supabase
            .from("agents")
            .insert({
              name,
              icon,
              description,
              category,
              system_prompt,
              base_model,
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
            base_model,
          }
        },
      },
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    headers: STREAM_RESPONSE_HEADERS,
    onFinish: async ({ messages: resultMessages }) => {
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
        model: "claude-sonnet-4-6",
        requestTrigger: "submit-message",
        userMessageChars: latestUserText.length,
        assistantMessageChars: assistantText.length,
      })
    },
  })
}
