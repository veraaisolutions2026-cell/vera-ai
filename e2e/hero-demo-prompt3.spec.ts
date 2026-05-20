import { expect, test } from "@playwright/test"

test.describe("Hero Demo — Prompt 3 (AI Thinking + Agent Result + Chat Transition)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-testid="hero-demo"]', { timeout: 10_000 })
  })

  test("ai-thinking scene renders after agent-builder", async ({ page }) => {
    const thinking = page.locator('[data-testid="demo-scene-ai-thinking"]')
    await expect(thinking).toBeVisible({ timeout: 24_000 })
  })

  test("ai-thinking scene streams steps and completion text", async ({
    page,
  }) => {
    const thinking = page.locator('[data-testid="demo-scene-ai-thinking"]')
    await thinking.waitFor({ state: "visible", timeout: 24_000 })

    await expect(thinking.getByText("Analysing requirements...")).toBeVisible({
      timeout: 4_000,
    })
    await expect(thinking.getByText("Crafting system prompt...")).toBeVisible({
      timeout: 4_000,
    })
    await expect(thinking.getByText("Building tool schema...")).toBeVisible({
      timeout: 6_000,
    })
    await expect(
      thinking.getByText("Final validation and guardrails...")
    ).toBeVisible({
      timeout: 6_000,
    })
    await expect(
      thinking.getByText("Done! Your Forsa agent is ready.")
    ).toBeVisible({
      timeout: 7_000,
    })
  })

  test("agent-result scene shows created travers card", async ({ page }) => {
    const result = page.locator('[data-testid="demo-scene-agent-result"]')
    await result.waitFor({ state: "visible", timeout: 30_000 })

    await expect(result.getByText("Agent created")).toBeVisible()
    await expect(result.getByText("Forsa", { exact: true })).toBeVisible()
    await expect(result.getByText("IFRS Reviewing Agent")).toBeVisible()
    await expect(result.getByText("Model: Vera Pro")).toBeVisible()
  })

  test("chat-transition scene shows tagline then chat shell", async ({
    page,
  }) => {
    const transition = page.locator(
      '[data-testid="demo-scene-chat-transition"]'
    )
    await transition.waitFor({ state: "visible", timeout: 35_000 })

    const tagline = transition.locator(
      '[data-testid="demo-chat-transition-tagline"]'
    )
    await expect(tagline).toContainText("Your")
    await expect(tagline).toContainText("deployed.")
    await expect(tagline).toContainText("agent")

    const panel = transition.locator(
      '[data-testid="demo-chat-transition-panel"]'
    )
    await expect(panel).toBeVisible({ timeout: 4_000 })

    await expect(panel.getByText("Vera Pro")).toBeVisible({
      timeout: 4_000,
    })
    await expect(panel.getByText("Forsa", { exact: true })).toBeVisible({
      timeout: 4_000,
    })
  })
})
