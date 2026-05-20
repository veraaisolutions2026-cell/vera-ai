import { expect, test, type Locator, type Page } from "@playwright/test"

async function toggleSetting(page: Page, toggle: Locator): Promise<void> {
  const enabled = (await toggle.getAttribute("data-state")) === "checked"

  await toggle.click()
  await expect(toggle).toHaveAttribute(
    "data-state",
    enabled ? "unchecked" : "checked"
  )
  await expect(page.getByText("Memory settings saved").last()).toBeVisible()

  await toggle.click()
  await expect(toggle).toHaveAttribute(
    "data-state",
    enabled ? "checked" : "unchecked"
  )
  await expect(page.getByText("Memory settings saved").last()).toBeVisible()
}

async function chooseDropdownOption(
  page: Page,
  triggerTestId: string,
  value: string
): Promise<void> {
  await page.getByTestId(triggerTestId).click()
  await page.getByTestId(`${triggerTestId}-${value}`).click()
}

test("memory route supports toggles, manual add/edit, and confirmed deletion", async ({
  page,
}) => {
  const uniqueKey = `${Date.now()}`
  const title = `Playwright memory ${uniqueKey}`
  const initialContent = `Remember that I prefer control-first summaries ${uniqueKey}.`
  const updatedContent = `Remember that I prefer concise control summaries ${uniqueKey}.`

  await page.goto("/dashboard/memory", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("memory-workspace")).toBeVisible({
    timeout: 60_000,
  })

  await toggleSetting(page, page.getByTestId("memory-setting-saved-memories"))
  await toggleSetting(page, page.getByTestId("memory-setting-chat-history"))

  await page.getByTestId("memory-title-input").fill(title)
  await chooseDropdownOption(page, "memory-category-select", "work-context")
  await chooseDropdownOption(page, "memory-priority-select", "core")
  await page.getByTestId("memory-content-input").fill(initialContent)
  await page.getByTestId("memory-save-button").click()

  const memoryCard = page
    .getByTestId("memory-card")
    .filter({ hasText: title })
    .first()

  await expect(memoryCard).toBeVisible({ timeout: 60_000 })

  await page.getByTestId("memory-search-input").fill(uniqueKey)

  await expect(memoryCard).toContainText(initialContent)

  await memoryCard.getByRole("button", { name: "Edit" }).click()
  await page.getByTestId("memory-content-input").fill(updatedContent)
  await page.getByTestId("memory-save-button").click()

  await expect(memoryCard).toContainText(updatedContent, { timeout: 60_000 })

  await page.getByTestId("memory-delete-all-button").click()
  await expect(page.getByTestId("memory-delete-all-dialog")).toBeVisible()
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByTestId("memory-delete-all-dialog")).toHaveCount(0)

  await memoryCard.getByRole("button", { name: "Delete" }).click()
  await expect(page.getByTestId("memory-delete-dialog")).toBeVisible()
  await page.getByTestId("memory-delete-confirm").click()

  await expect(memoryCard).toHaveCount(0, { timeout: 60_000 })
})

test("memory route can delete all saved memories after confirmation", async ({
  page,
}) => {
  const firstKey = `bulk-one-${Date.now()}`
  const secondKey = `bulk-two-${Date.now()}`

  await page.goto("/dashboard/memory", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("memory-workspace")).toBeVisible({
    timeout: 60_000,
  })

  await page.getByTestId("memory-title-input").fill(`Bulk memory ${firstKey}`)
  await chooseDropdownOption(page, "memory-category-select", "preference")
  await chooseDropdownOption(page, "memory-priority-select", "standard")
  await page.getByTestId("memory-content-input").fill(firstKey)
  await page.getByTestId("memory-save-button").click()

  const firstCard = page
    .getByTestId("memory-card")
    .filter({ hasText: firstKey })
  await expect(firstCard).toBeVisible({ timeout: 60_000 })

  await page.getByTestId("memory-title-input").fill(`Bulk memory ${secondKey}`)
  await chooseDropdownOption(page, "memory-category-select", "preference")
  await chooseDropdownOption(page, "memory-priority-select", "standard")
  await page.getByTestId("memory-content-input").fill(secondKey)
  await page.getByTestId("memory-save-button").click()

  const secondCard = page
    .getByTestId("memory-card")
    .filter({ hasText: secondKey })
  await expect(secondCard).toBeVisible({ timeout: 60_000 })

  await page.getByTestId("memory-delete-all-button").click()
  await expect(page.getByTestId("memory-delete-all-dialog")).toBeVisible()
  await page.getByTestId("memory-delete-all-confirm").click()

  await expect(firstCard).toHaveCount(0, { timeout: 60_000 })
  await expect(secondCard).toHaveCount(0, { timeout: 60_000 })
})
