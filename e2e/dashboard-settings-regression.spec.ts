import { expect, test } from "@playwright/test"

function getAnswerPreferenceValue(
  text: string | null | undefined
): "short" | "long" | null {
  if (!text) {
    return null
  }

  if (/long answer/i.test(text)) {
    return "long"
  }

  if (/short answer/i.test(text)) {
    return "short"
  }

  return null
}

function getAnswerPreferenceLabel(value: "short" | "long"): string {
  return value === "short" ? "Short answer" : "Long answer"
}

test("sidebar navigation reaches settings and answer preference persists", async ({
  page,
}) => {
  await page.goto("/dashboard/chat")

  const accountMenuButton = page
    .locator("aside")
    .getByRole("button")
    .filter({ hasText: /@/ })
    .last()

  await accountMenuButton.click()
  await page.getByRole("link", { name: "Settings" }).click()

  await expect(page).toHaveURL(/\/dashboard\/settings$/)

  await page.keyboard.press("Escape")

  const trigger = page.getByTestId("settings-answer-preference")
  await expect(trigger).toBeVisible()

  const initialValue = getAnswerPreferenceValue(await trigger.textContent())
  const targetValue = initialValue === "long" ? "short" : "long"
  const targetLabel = getAnswerPreferenceLabel(targetValue)

  await trigger.click()
  await page.getByTestId(`settings-answer-preference-${targetValue}`).click()

  await expect(page.getByText("Preference saved").last()).toBeVisible()
  await expect(trigger).toContainText(targetLabel)

  await page.reload()

  await expect(page).toHaveURL(/\/dashboard\/settings$/)
  await expect(trigger).toContainText(targetLabel)

  if (initialValue && initialValue !== targetValue) {
    const initialLabel = getAnswerPreferenceLabel(initialValue)

    await trigger.click()
    await page.getByTestId(`settings-answer-preference-${initialValue}`).click()

    await expect(page.getByText("Preference saved").last()).toBeVisible()
    await expect(trigger).toContainText(initialLabel)
  }
})
