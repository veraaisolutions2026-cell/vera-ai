import { expect, test } from "@playwright/test"

test("memory route is reachable from the dashboard and shows the memory workspace", async ({
  page,
}) => {
  await page.goto("/dashboard/chat")

  await page.getByRole("link", { name: "Memory" }).click()

  await expect(page).toHaveURL(/\/dashboard\/memory$/)
  await expect(page.getByTestId("memory-page")).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "Memory", exact: true })
  ).toBeVisible()

  await expect(page.getByTestId("memory-status-grid")).toContainText(
    "Saved memories"
  )
  await expect(page.getByTestId("memory-status-grid")).toContainText(
    "Use saved memories"
  )
  await expect(page.getByTestId("memory-status-grid")).toContainText(
    "Use chat history"
  )
  await expect(page.getByTestId("memory-workspace")).toBeVisible()
})
