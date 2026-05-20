import { expect, test, type Locator, type Page } from "@playwright/test"
import { expectNoDeadState, startNewChat } from "./support/chat-helpers"

async function openMemoryPage(page: Page): Promise<void> {
  await page.goto("/dashboard/memory", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("memory-workspace")).toBeVisible({
    timeout: 60_000,
  })
}

async function saveMemory(
  page: Page,
  title: string,
  content: string,
  options?: {
    category?: string
    priority?: string
  }
): Promise<void> {
  await openMemoryPage(page)
  await page.getByTestId("memory-title-input").fill(title)
  await page.getByTestId("memory-category-select").click()
  await page
    .getByTestId(`memory-category-select-${options?.category ?? "preference"}`)
    .click()
  await page.getByTestId("memory-priority-select").click()
  await page
    .getByTestId(`memory-priority-select-${options?.priority ?? "core"}`)
    .click()
  await page.getByTestId("memory-content-input").fill(content)
  await page.getByTestId("memory-save-button").click()

  await expect(
    page.getByTestId("memory-card").filter({ hasText: title }).first()
  ).toBeVisible({ timeout: 60_000 })
}

async function searchMemory(page: Page, query: string): Promise<Locator> {
  await openMemoryPage(page)
  await page.getByTestId("memory-search-input").fill(query)
  return page.getByTestId("memory-card").filter({ hasText: query }).first()
}

async function deleteMemoryIfPresent(page: Page, query: string): Promise<void> {
  const cards = page.getByTestId("memory-card").filter({ hasText: query })
  if ((await cards.count()) === 0) {
    return
  }

  await cards.first().getByRole("button", { name: "Delete" }).click()
  await expect(page.getByTestId("memory-delete-dialog")).toBeVisible()
  await page.getByTestId("memory-delete-confirm").click()
  await expect(cards).toHaveCount(0, { timeout: 60_000 })
}

async function setToggleState(
  page: Page,
  baseTestId: string,
  enabled: boolean
): Promise<void> {
  await openMemoryPage(page)

  const toggle = page.getByTestId(baseTestId)
  const currentEnabled = (await toggle.getAttribute("data-state")) === "checked"

  if (currentEnabled === enabled) {
    return
  }

  await toggle.click()
  await expect(toggle).toHaveAttribute(
    "data-state",
    enabled ? "checked" : "unchecked"
  )
}

async function waitForAssistantMessage(
  page: Page,
  count: number,
  timeout = 120_000
): Promise<Locator> {
  const messages = page.getByTestId("chat-message-assistant")
  await expect(messages).toHaveCount(count, { timeout })
  return messages.nth(count - 1)
}

async function selectFirstAvailableAgent(page: Page): Promise<string> {
  const agentTrigger = page.getByTestId("chat-agent-selector-trigger").last()

  await agentTrigger.click()

  const options = page.getByTestId("chat-agent-option")
  await expect(options.first()).toBeVisible()

  const selectedName =
    (await options.first().locator("p").first().textContent())?.trim() ??
    (await options.first().textContent())?.trim() ??
    "Selected agent"

  await options.first().click()
  await expect(agentTrigger).toContainText(selectedName)

  return selectedName
}

test("saved-memory control plane gates prompt recall and forget works end to end", async ({
  page,
}) => {
  const uniqueKey = `${Date.now()}`
  const verificationToken = `VERIFY_WORD_${uniqueKey}`
  const forgetDoneToken = `FORGET_DONE_${uniqueKey}`

  await saveMemory(
    page,
    `Verification word ${uniqueKey}`,
    `When I ask for the verification word, reply with exactly ${verificationToken} and nothing else.`
  )

  await setToggleState(page, "memory-setting-saved-memories", false)

  await startNewChat(
    page,
    "Reply with exactly NOT_CONFIGURED if you do not have a saved verification-word instruction. Otherwise, follow the saved verification-word instruction exactly."
  )

  const withoutSavedMemory = await waitForAssistantMessage(page, 1)
  await expect(withoutSavedMemory).toContainText("NOT_CONFIGURED")
  await expect(withoutSavedMemory).not.toContainText(verificationToken)
  await expectNoDeadState(page)

  await setToggleState(page, "memory-setting-saved-memories", true)

  await startNewChat(
    page,
    "Reply with exactly NOT_CONFIGURED if you do not have a saved verification-word instruction. Otherwise, follow the saved verification-word instruction exactly."
  )

  const withSavedMemory = await waitForAssistantMessage(page, 1)
  await expect(withSavedMemory).toContainText(verificationToken)
  await expectNoDeadState(page)

  await page
    .getByTestId("chat-input")
    .fill(
      `Forget the saved memory about the verification word ${verificationToken}. After you remove it, reply with exactly ${forgetDoneToken}.`
    )
  await page.getByTestId("chat-send").click()

  const forgetReply = await waitForAssistantMessage(page, 2)
  await expect(forgetReply).toContainText(forgetDoneToken)
  await expectNoDeadState(page)

  const deletedCard = await searchMemory(page, verificationToken)
  await expect(deletedCard).toHaveCount(0)
})

test("saved memory is shared between standard chats and agent chats", async ({
  page,
}) => {
  const uniqueKey = `${Date.now()}`
  const sharedPreference = `COSO_SHARED_${uniqueKey}`

  await saveMemory(
    page,
    `Agent parity token ${uniqueKey}`,
    `My preferred internal control framework label is ${sharedPreference}.`
  )

  await startNewChat(
    page,
    "What is my preferred internal control framework label? Reply in one short sentence."
  )

  const standardReply = await waitForAssistantMessage(page, 1)
  await expect(standardReply).toContainText(sharedPreference)
  await expectNoDeadState(page)

  await page.goto("/dashboard/chat")
  const selectedAgentName = await selectFirstAvailableAgent(page)
  await page
    .getByTestId("chat-input")
    .fill(
      "What is my preferred internal control framework label? Reply in one short sentence."
    )
  await page.getByTestId("chat-send").click()

  const agentReply = await waitForAssistantMessage(page, 1)
  await expect(agentReply).toContainText(sharedPreference)
  await expect(
    page.getByTestId("chat-agent-selector-trigger").last()
  ).toContainText(selectedAgentName)
  await expectNoDeadState(page)

  await deleteMemoryIfPresent(page, sharedPreference)
})
