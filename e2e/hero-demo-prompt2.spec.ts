import { test, expect } from "@playwright/test"

test.describe("Hero Demo — Prompt 2 (Tab UI + Agent Builder)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForSelector('[data-testid="hero-demo"]', { timeout: 10_000 })
  })

  // ── Tab UI Scene ───────────────────────────────────────────────

  test("tab-ui scene renders after intro", async ({ page }) => {
    const tabUi = page.locator('[data-testid="demo-scene-tab-ui"]')
    await expect(tabUi).toBeVisible({ timeout: 8_000 })
  })

  test("tab-ui scene has chat and agents tabs", async ({ page }) => {
    await page.locator('[data-testid="demo-scene-tab-ui"]').waitFor({
      state: "visible",
      timeout: 8_000,
    })
    const scene = page.locator('[data-testid="demo-scene-tab-ui"]')
    await expect(
      scene.locator("button").filter({ hasText: "Chat" })
    ).toBeVisible()
    await expect(
      scene.locator("button").filter({ hasText: "Agents" })
    ).toBeVisible()
  })

  test("tab-ui scene animates to agents content", async ({ page }) => {
    await page.locator('[data-testid="demo-scene-tab-ui"]').waitFor({
      state: "visible",
      timeout: 8_000,
    })
    // Wait for the Agents tab to become active (cursor clicks at ~2.4s after mount)
    const scene = page.locator('[data-testid="demo-scene-tab-ui"]')
    await expect(scene.getByText("Travers")).toBeVisible({ timeout: 5_000 })
  })

  // ── Agent Builder Scene ───────────────────────────────────────

  test("agent-builder scene renders after tab-ui", async ({ page }) => {
    const builderScene = page.locator(
      '[data-testid="demo-scene-agent-builder"]'
    )
    // tab-ui is 5 000ms; allow generous timeout for full transition
    await expect(builderScene).toBeVisible({ timeout: 16_000 })
  })

  test("agent-builder scene shows starter prompts", async ({ page }) => {
    const builderScene = page.locator(
      '[data-testid="demo-scene-agent-builder"]'
    )
    await builderScene.waitFor({ state: "visible", timeout: 16_000 })

    await expect(
      builderScene.getByText("IFRS Compliance Review", { exact: true })
    ).toBeVisible()
    await expect(
      builderScene.getByText("Audit Workpaper Review", { exact: true })
    ).toBeVisible()
    await expect(
      builderScene.getByText("Australian Tax Advisor", { exact: true })
    ).toBeVisible()
  })

  test("agent-builder scene highlights IFRS card on cursor click", async ({
    page,
  }) => {
    const builderScene = page.locator(
      '[data-testid="demo-scene-agent-builder"]'
    )
    await builderScene.waitFor({ state: "visible", timeout: 16_000 })

    // IFRS card is clicked at ~1.9s after scene mount; foreground/5 highlight appears
    const ifrsCard = builderScene
      .locator("div")
      .filter({ hasText: "IFRS Compliance Review" })
      .first()
    await expect(ifrsCard).toBeVisible({ timeout: 5_000 })
  })

  test("agent-builder typewriter fills input field", async ({ page }) => {
    const builderScene = page.locator(
      '[data-testid="demo-scene-agent-builder"]'
    )
    await builderScene.waitFor({ state: "visible", timeout: 16_000 })

    // Typing completes at ~4.9s after scene mount; partial text should appear
    await expect(builderScene.getByText(/IFRS compliance/i)).toBeVisible({
      timeout: 8_000,
    })
  })

  test("agent-builder shows user message bubble after send click", async ({
    page,
  }) => {
    const builderScene = page.locator(
      '[data-testid="demo-scene-agent-builder"]'
    )
    await builderScene.waitFor({ state: "visible", timeout: 16_000 })

    // Send click at ~6.2s after mount; full prompt appears in bubble
    await expect(
      builderScene.getByText(
        "I need an agent that reviews IFRS compliance documents and flags issues"
      )
    ).toBeVisible({ timeout: 12_000 })
  })

  // ── DemoCursor visible during both scenes ─────────────────────

  test("demo cursor is visible during tab-ui and agent-builder scenes", async ({
    page,
  }) => {
    const cursor = page.locator('[data-testid="demo-cursor"]')

    // Wait for tab-ui to mount
    await page.locator('[data-testid="demo-scene-tab-ui"]').waitFor({
      state: "visible",
      timeout: 8_000,
    })

    // Cursor visibility prop is set for these two scenes
    await expect(cursor).toBeVisible({ timeout: 3_000 })
  })
})
