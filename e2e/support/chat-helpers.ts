import { expect, type Page, type Request } from "@playwright/test"

export type AnswerPreference = "short" | "long"

const CHAT_ROUTE_PATTERN = /\/dashboard\/chat\/[^/?]+(?:\?.*)?$/
const DEAD_STATE_PATTERN =
  /I couldn't generate a response this time|Response did not start|Connection dropped before the assistant response was returned|We could not recover automatically/i

function getAnswerPreferenceTestId(preference: AnswerPreference): string {
  return preference === "short" ? "chat-answer-short" : "chat-answer-long"
}

export function createRequestCounter(
  page: Page,
  predicate: (request: Request) => boolean
): { getCount: () => number; dispose: () => void } {
  let count = 0

  const handler = (request: Request) => {
    if (predicate(request)) {
      count += 1
    }
  }

  page.on("request", handler)

  return {
    getCount: () => count,
    dispose: () => page.off("request", handler),
  }
}

export async function resolveAnswerPreferenceIfPresent(
  page: Page,
  preference: AnswerPreference = "short"
): Promise<void> {
  const button = page.getByTestId(getAnswerPreferenceTestId(preference))

  if (await button.isVisible().catch(() => false)) {
    await button.click()
  }
}

export async function waitForChatRoute(page: Page): Promise<string> {
  await page.waitForURL(CHAT_ROUTE_PATTERN)

  const pathname = new URL(page.url()).pathname
  const chatId = pathname.split("/").pop()?.trim()
  if (!chatId) {
    throw new Error("Expected a chat route with a chat ID")
  }

  return chatId
}

export async function startNewChat(
  page: Page,
  prompt: string,
  options?: {
    answerPreference?: AnswerPreference
  }
): Promise<string> {
  await page.goto("/dashboard/chat")
  await page.getByTestId("chat-input").fill(prompt)
  await page.getByTestId("chat-send").click()

  const chatId = await waitForChatRoute(page)
  await resolveAnswerPreferenceIfPresent(
    page,
    options?.answerPreference ?? "short"
  )

  return chatId
}

export async function waitForAssistantReply(
  page: Page,
  expectedText: string | RegExp,
  timeout = 120_000
): Promise<void> {
  await expect(page.getByTestId("chat-message-assistant").last()).toContainText(
    expectedText,
    {
      timeout,
    }
  )
}

export async function expectNoDeadState(page: Page): Promise<void> {
  await expect(page.getByText(DEAD_STATE_PATTERN)).toHaveCount(0)
  await expect(page.getByTestId("chat-stop")).toHaveCount(0, {
    timeout: 60_000,
  })
}
