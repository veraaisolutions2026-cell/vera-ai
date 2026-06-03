import { createClient } from "@supabase/supabase-js"
import { expect, test, type Page } from "@playwright/test"
import type { Database } from "../types/supabase"
import {
  expectNoDeadState,
  resolveAnswerPreferenceIfPresent,
  waitForAssistantReply,
  waitForChatRoute,
} from "./support/chat-helpers"
import { loadLocalEnvFiles } from "./support/env"
import { ensurePlaywrightUser } from "./support/test-user"

loadLocalEnvFiles()

type PromptCase = {
  prompt: string
  expected: RegExp
}

type AgentFixture = {
  name: string
  signature: RegExp
  prompts: PromptCase[]
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Custom agent Playwright tests require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment."
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function seedCustomAgent(
  userId: string,
  input: {
    name: string
    description: string
    category: string
    systemPrompt: string
  }
) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("agents")
    .insert({
      user_id: userId,
      is_builtin: false,
      icon: "Bot",
      name: input.name,
      description: input.description,
      category: input.category,
      system_prompt: input.systemPrompt,
      base_model: "claude-sonnet-4.6",
    })
    .select("id, name")
    .single()

  if (error || !data) {
    throw new Error(
      `Unable to seed custom agent ${input.name}: ${error?.message ?? "Unknown error"}`
    )
  }

  return data
}

async function selectAgent(page: Page, agentName: string) {
  await page.getByTestId("chat-agent-selector-trigger").click()
  await page.getByTestId("chat-agent-search").fill(agentName)

  const option = page
    .getByTestId("chat-agent-option")
    .filter({ hasText: agentName })
    .first()

  await expect(option).toBeVisible({ timeout: 30_000 })
  await option.click()
  await expect(page.getByTestId("chat-agent-selector-trigger")).toContainText(
    agentName
  )
}

async function startAgentChat(page: Page, agentName: string, prompt: string) {
  await page.goto("/dashboard/chat")
  await selectAgent(page, agentName)
  await page.getByTestId("chat-input").fill(prompt)
  await page.getByTestId("chat-send").click()
  await waitForChatRoute(page)
  await resolveAnswerPreferenceIfPresent(page, "short")
}

const revenuePrompts: PromptCase[] = [
  {
    prompt:
      "Explain the criteria under AASB 15 for recognising revenue over time rather than at a point in time.",
    expected: /AASB 15|over time|point in time/i,
  },
  {
    prompt:
      "How do I apply the simplified approach for expected credit losses to a trade receivables matrix under AASB 9?",
    expected: /expected credit loss|trade receivables|AASB 9/i,
  },
  {
    prompt:
      "What are the specific audit procedures required to test revenue cut-off for a wholesale distributor?",
    expected: /revenue cut-?off|wholesale distributor|audit procedures/i,
  },
  {
    prompt:
      "Draft an audit program to test the completeness of revenue for a software-as-a-service company.",
    expected:
      /audit program|completeness of revenue|software-as-a-service|SaaS/i,
  },
  {
    prompt:
      "How should a client account for a government grant related to the purchase of heavy machinery under AASB 120?",
    expected: /government grant|AASB 120|heavy machinery/i,
  },
  {
    prompt:
      "What factors indicate that a client is acting as an agent rather than a principal under AASB 15?",
    expected: /agent|principal|AASB 15/i,
  },
  {
    prompt:
      "Outline a substantive analytical procedure for testing retail store revenue.",
    expected:
      /substantive analytical procedure|retail store revenue|expectation/i,
  },
  {
    prompt:
      "How should variable consideration be constrained under AASB 15 when a contract includes significant performance bonuses?",
    expected: /variable consideration|constraint|performance bonuses|AASB 15/i,
  },
  {
    prompt:
      "What is the framework for rebutting the presumed risk of fraud in revenue recognition under ASA 240?",
    expected: /ASA 240|fraud|revenue recognition|rebut/i,
  },
  {
    prompt:
      "Design a debtor confirmation strategy for a construction client with a small number of high-value contracts.",
    expected: /debtor confirmation|construction client|high-value contracts/i,
  },
] as const

const treasuryPrompts: PromptCase[] = [
  {
    prompt:
      "Explain the difference between the hold to collect and hold to collect and sell business models under AASB 9.",
    expected: /hold to collect|hold to collect and sell|AASB 9/i,
  },
  {
    prompt:
      "What are the requirements for a financial asset to pass the solely payments of principal and interest test?",
    expected: /solely payments of principal and interest|SPPI|financial asset/i,
  },
  {
    prompt:
      "Outline the criteria for a financial instrument to transition from Stage 1 to Stage 2 in the general expected credit loss model.",
    expected:
      /Stage 1|Stage 2|expected credit loss|significant increase in credit risk/i,
  },
  {
    prompt:
      "Draft a memo evaluating whether redeemable preference shares should be classified as debt or equity under AASB 132.",
    expected: /redeemable preference shares|debt|equity|AASB 132/i,
  },
  {
    prompt:
      "How do we test the effectiveness of a cash flow hedge for an interest rate swap under AASB 9?",
    expected: /cash flow hedge|interest rate swap|effectiveness|AASB 9/i,
  },
  {
    prompt:
      "What are the specific disclosure requirements under AASB 7 for financial assets measured at fair value through profit or loss?",
    expected: /AASB 7|fair value through profit or loss|FVTPL|disclosure/i,
  },
  {
    prompt:
      "Provide the audit procedures required to verify the valuation of a Level 2 interest rate derivative.",
    expected: /Level 2|interest rate derivative|valuation|audit procedures/i,
  },
  {
    prompt:
      "Explain how forward-looking macroeconomic factors must be incorporated into an expected credit loss calculation.",
    expected: /forward-looking|macroeconomic|expected credit loss/i,
  },
  {
    prompt:
      "What considerations apply under ASA 620 when using a management expert to value a complex financial instrument?",
    expected: /ASA 620|management expert|complex financial instrument/i,
  },
  {
    prompt:
      "Design a control sheet for managing and tracking external bank confirmations for a large corporate group.",
    expected: /control sheet|bank confirmations|large corporate group/i,
  },
] as const

const agentFixtures: AgentFixture[] = []

test.beforeAll(async () => {
  const { userId } = await ensurePlaywrightUser()
  const runId = Date.now()

  const revenueAgent = await seedCustomAgent(userId, {
    name: `PW Revenue Receivables ${runId}`,
    description:
      "Revenue and receivables specialist for AASB, ASA, audit procedures, and debtor testing.",
    category: "Audit",
    systemPrompt: [
      "You are Vera's Revenue and Receivables specialist.",
      'Start every answer with the exact prefix "RevenueReceivablesAgent:".',
      "Answer in clear audit-focused language with short headings and concise bullets.",
      "Reference AASB and ASA concepts directly when relevant.",
      "Do not use emojis.",
    ].join(" "),
  })

  const treasuryAgent = await seedCustomAgent(userId, {
    name: `PW Treasury Instruments ${runId}`,
    description:
      "Financial instruments and treasury specialist for AASB 7, 9, 132, hedging, and valuation.",
    category: "Audit",
    systemPrompt: [
      "You are Vera's Financial Instruments and Treasury specialist.",
      'Start every answer with the exact prefix "TreasuryInstrumentsAgent:".',
      "Answer in clear audit-focused language with short headings and concise bullets.",
      "Reference AASB and ASA concepts directly when relevant.",
      "Do not use emojis.",
    ].join(" "),
  })

  agentFixtures.push(
    {
      name: revenueAgent.name,
      signature: /RevenueReceivablesAgent:/i,
      prompts: [...revenuePrompts],
    },
    {
      name: treasuryAgent.name,
      signature: /TreasuryInstrumentsAgent:/i,
      prompts: [...treasuryPrompts],
    }
  )
})

for (const fixtureName of [
  "Revenue & Receivables",
  "Financial Instruments & Treasury",
] as const) {
  test(`${fixtureName} agent replies across the client prompt set without dead-state failures`, async ({
    page,
  }) => {
    test.setTimeout(900_000)

    const fixture = agentFixtures.find((candidate) =>
      fixtureName.startsWith("Revenue")
        ? candidate.signature.test("RevenueReceivablesAgent:")
        : candidate.signature.test("TreasuryInstrumentsAgent:")
    )

    if (!fixture) {
      throw new Error(`Missing seeded fixture for ${fixtureName}`)
    }

    for (const [index, promptCase] of fixture.prompts.entries()) {
      await test.step(`prompt ${index + 1}: ${promptCase.prompt}`, async () => {
        await startAgentChat(page, fixture.name, promptCase.prompt)

        await waitForAssistantReply(page, fixture.signature, 120_000)
        await expect(
          page.getByTestId("chat-message-assistant").last()
        ).toContainText(promptCase.expected, {
          timeout: 120_000,
        })
        await expectNoDeadState(page)
      })
    }
  })
}
