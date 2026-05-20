import { expect, test } from "@playwright/test"

test("dashboard agent builder uses the shared model picker labels", async ({
  page,
}) => {
  await page.goto("/dashboard/agents/new")
  await expect(page).toHaveURL(/\/dashboard\/agents\/new$/)

  const trigger = page.getByTestId("model-picker-trigger")
  await expect(trigger).toContainText("Vera Pro")

  await trigger.click()

  const options = page.getByTestId("model-picker-option")
  await expect(options).toHaveCount(3)
  await expect(options.nth(0)).toContainText("Vera Mini")
  await expect(options.nth(1)).toContainText("Vera Pro")
  await expect(options.nth(2)).toContainText("Vera Max")
})
