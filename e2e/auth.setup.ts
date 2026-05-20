import fs from "node:fs"
import path from "node:path"
import { expect, test as setup } from "@playwright/test"
import { AUTH_STORAGE_STATE_PATH } from "./support/constants"
import { ensurePlaywrightUser } from "./support/test-user"

setup("authenticate playwright user", async ({ page }) => {
  const { email, password } = await ensurePlaywrightUser()

  fs.mkdirSync(path.dirname(AUTH_STORAGE_STATE_PATH), { recursive: true })

  await page.goto("/login")
  await page.getByRole("button", { name: "Continue with email" }).click()
  await page.getByPlaceholder("Email address").fill(email)
  await page.getByPlaceholder("Password").fill(password)

  await Promise.all([
    page.waitForURL(/\/dashboard(?:\/.*)?$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ])

  await expect(page).toHaveURL(/\/dashboard(?:\/.*)?$/)
  await page.context().storageState({ path: AUTH_STORAGE_STATE_PATH })
})
