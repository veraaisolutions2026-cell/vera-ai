import { createClient } from "@supabase/supabase-js"
import type { Database } from "../../types/supabase"
import { DEFAULT_E2E_USER_EMAIL, DEFAULT_E2E_USER_NAME } from "./constants"
import { loadLocalEnvFiles } from "./env"

loadLocalEnvFiles()

const generatedPassword =
  process.env.PLAYWRIGHT_TEST_PASSWORD?.trim() || "VeraPlaywright-E2E-Aa1!"

const testUserEmail =
  process.env.PLAYWRIGHT_TEST_EMAIL?.trim() || DEFAULT_E2E_USER_EMAIL
const testUserName =
  process.env.PLAYWRIGHT_TEST_NAME?.trim() || DEFAULT_E2E_USER_NAME

type PlaywrightUser = {
  email: string
  password: string
  fullName: string
  userId: string
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Playwright setup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment."
    )
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function getExistingUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) {
    throw new Error(
      `Unable to list Supabase users for Playwright: ${error.message}`
    )
  }

  const existingUser = data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  )

  return existingUser?.id ?? null
}

async function ensureAuthUser(
  email: string,
  password: string,
  fullName: string
): Promise<string> {
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (!error && data.user) {
    return data.user.id
  }

  const message = error?.message.toLowerCase() ?? ""
  const alreadyExists =
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")

  if (!alreadyExists) {
    throw new Error(
      `Unable to create the Playwright Supabase user: ${error?.message ?? "Unknown error"}`
    )
  }

  const existingUserId = await getExistingUserIdByEmail(email)
  if (!existingUserId) {
    throw new Error(
      "The Playwright Supabase user already exists, but its user ID could not be resolved."
    )
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    existingUserId,
    {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    }
  )

  if (updateError) {
    throw new Error(
      `Unable to update the Playwright Supabase user password: ${updateError.message}`
    )
  }

  return existingUserId
}

async function ensureProfileAndSubscription(userId: string, fullName: string) {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      role: "user",
      updated_at: nowIso,
    },
    {
      onConflict: "id",
    }
  )

  if (profileError) {
    throw new Error(
      `Unable to upsert the Playwright profile row: ${profileError.message}`
    )
  }

  const { error: subscriptionError } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: "vera-intelligence",
      status: "active",
      billing_interval: "monthly",
      updated_at: nowIso,
    },
    {
      onConflict: "user_id",
    }
  )

  if (subscriptionError) {
    throw new Error(
      `Unable to upsert the Playwright subscription row: ${subscriptionError.message}`
    )
  }
}

export async function ensurePlaywrightUser(): Promise<PlaywrightUser> {
  const userId = await ensureAuthUser(
    testUserEmail,
    generatedPassword,
    testUserName
  )

  await ensureProfileAndSubscription(userId, testUserName)

  return {
    email: testUserEmail,
    password: generatedPassword,
    fullName: testUserName,
    userId,
  }
}
