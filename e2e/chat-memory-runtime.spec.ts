import { expect, test } from "@playwright/test"
import {
  expectNoDeadState,
  resolveAnswerPreferenceIfPresent,
  startNewChat,
  waitForAssistantReply,
} from "./support/chat-helpers"

test("main chat still replies and reloads cleanly with memory runtime enabled", async ({
  page,
}) => {
  const prompt =
    "Briefly explain what saved memory means in a chat assistant and include the phrase 'saved memory'."

  const chatId = await startNewChat(page, prompt)

  await waitForAssistantReply(page, /saved memory/i)
  await expectNoDeadState(page)

  await page.reload()
  await resolveAnswerPreferenceIfPresent(page)
  await expect(page).toHaveURL(new RegExp(`/dashboard/chat/${chatId}(\\?.*)?$`))
  await waitForAssistantReply(page, /saved memory/i, 60_000)
  await expectNoDeadState(page)
})
