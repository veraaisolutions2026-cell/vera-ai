import { expect, test } from "@playwright/test"
import { createRequestCounter } from "./support/chat-helpers"

test("dashboard agent builder chat streams and saves an agent", async ({
  page,
}) => {
  const agentBuilderRequests = createRequestCounter(page, (request) => {
    return (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/agent-builder/chat"
    )
  })

  try {
    const uniqueName = `Playwright Audit Agent ${Date.now()}`
    const prompt = [
      "Create and save the agent now. Do not ask follow-up questions.",
      `Name: ${uniqueName}.`,
      "Description: Reviews audit evidence packs, flags IFRS control issues, and returns risk-ranked findings.",
      "Category: Audit.",
      "Model: Claude Sonnet 4.6.",
      "Use reasonable defaults for any missing details and call the create_agent tool immediately.",
    ].join(" ")

    await page.goto("/dashboard/agents/new")
    await page.getByTestId("agent-builder-chat-input").fill(prompt)
    await page.getByTestId("agent-builder-chat-send").click()

    await expect(
      page.getByTestId("agent-builder-user-message").last()
    ).toContainText(uniqueName)
    await expect(
      page.getByTestId("agent-builder-assistant-message").last()
    ).toContainText(uniqueName, {
      timeout: 120_000,
    })
    await expect(page.getByTestId("agent-builder-edit-agent")).toBeVisible({
      timeout: 120_000,
    })
    await expect.poll(() => agentBuilderRequests.getCount()).toBe(1)
  } finally {
    agentBuilderRequests.dispose()
  }
})
