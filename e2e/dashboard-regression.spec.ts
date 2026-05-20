import { expect, test } from "@playwright/test"

test("settings route still updates answer preference", async ({ page }) => {
  await page.goto("/dashboard/settings")

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()

  const dropdown = page.getByTestId("settings-answer-preference")
  await dropdown.click()

  const longOption = page.getByTestId("settings-answer-preference-long")
  await expect(longOption).toBeVisible()
  await longOption.click()

  await expect(page.getByText("Preference saved").last()).toBeVisible()
  await expect(dropdown).toContainText("Long answer")

  await dropdown.click()

  const shortOption = page.getByTestId("settings-answer-preference-short")
  await expect(shortOption).toBeVisible()
  await shortOption.click()

  await expect(page.getByText("Preference saved").last()).toBeVisible()
  await expect(dropdown).toContainText("Short answer")
})
