import { defineConfig, devices } from "@playwright/test"
import { AUTH_STORAGE_STATE_PATH } from "./e2e/support/constants"
import { loadLocalEnvFiles } from "./e2e/support/env"

loadLocalEnvFiles()

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || `http://127.0.0.1:${port}`
const playwrightProviderMode =
  process.env.PLAYWRIGHT_VERA_AI_PROVIDER_MODE?.trim() || "fallback"
const shouldReuseExistingServer = process.env.CI
  ? false
  : process.env.VERA_AI_PROVIDER_MODE?.trim() === playwrightProviderMode

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.PLAYWRIGHT_HEADED !== "true",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STORAGE_STATE_PATH,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: `pnpm exec next dev --turbopack --port ${port}`,
    env: {
      ...process.env,
      VERA_AI_PROVIDER_MODE: playwrightProviderMode,
    },
    url: `${baseURL}/login`,
    reuseExistingServer: shouldReuseExistingServer,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 180_000,
  },
})
