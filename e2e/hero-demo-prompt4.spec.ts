import { expect, test } from "@playwright/test"

test.describe("Hero Demo — Prompt 4 (Chat Demo + Full Loop)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-testid="hero-demo"]', { timeout: 10_000 })
  })

  test("chat-demo scene renders after chat-transition", async ({ page }) => {
    const scene = page.locator('[data-testid="demo-scene-chat-demo"]')
    await expect(scene).toBeVisible({ timeout: 42_000 })
  })

  test("chat-demo starts with created agent card and chat now action", async ({
    page,
  }) => {
    const scene = page.locator('[data-testid="demo-scene-chat-demo"]')
    await scene.waitFor({ state: "visible", timeout: 42_000 })

    const card = scene.locator('[data-testid="demo-chat-demo-card"]')
    await expect(card).toBeVisible({ timeout: 3_000 })
    await expect(card.getByText("Forsa", { exact: true })).toBeVisible()
    await expect(card.getByText("IFRS Reviewing Agent")).toBeVisible()
    await expect(card.getByText("Model: Vera Pro")).toBeVisible()
    await expect(
      card.locator("button").filter({ hasText: "Chat now" })
    ).toBeVisible()
  })

  test("chat-demo shows user question bubble", async ({ page }) => {
    const scene = page.locator('[data-testid="demo-scene-chat-demo"]')
    await scene.waitFor({ state: "visible", timeout: 42_000 })

    await expect(
      scene.locator('[data-testid="demo-chat-demo-panel"]')
    ).toBeVisible({
      timeout: 6_000,
    })

    const userBubble = scene.locator('[data-testid="demo-chat-demo-user"]')
    await expect(userBubble).toBeVisible({ timeout: 3_000 })
    await expect(userBubble).toContainText(
      "What are the top 3 compliance risks in this contract?"
    )
  })

  test("chat-demo streams assistant reply with compliance sections", async ({
    page,
  }) => {
    const scene = page.locator('[data-testid="demo-scene-chat-demo"]')
    await scene.waitFor({ state: "visible", timeout: 42_000 })

    await expect(scene.getByText("Vera Pro")).toBeVisible({ timeout: 6_000 })
    await expect(scene.getByText("Forsa", { exact: true })).toBeVisible({
      timeout: 6_000,
    })

    const assistant = scene.locator('[data-testid="demo-chat-demo-assistant"]')
    await expect(assistant).toBeVisible({ timeout: 5_000 })

    await expect(assistant).toContainText("top 3 compliance risks", {
      timeout: 6_000,
    })
    await expect(assistant).toContainText("Indemnification Clause (§8.3)", {
      timeout: 8_000,
    })
    await expect(assistant).toContainText("Data Residency (§12.1)", {
      timeout: 10_000,
    })
    await expect(assistant).toContainText("Termination Notice (§15)", {
      timeout: 12_000,
    })
    await expect(assistant).toContainText(
      "Recommend legal review before execution.",
      { timeout: 14_000 }
    )
  })

  test("chat-demo eventually transitions to outro", async ({ page }) => {
    const outro = page.locator('[data-testid="demo-scene-outro"]')
    await expect(outro).toBeVisible({ timeout: 55_000 })
    await expect(
      outro.locator('[aria-label="Every audit. Every insight. One platform."]')
    ).toBeVisible()
  })
})
