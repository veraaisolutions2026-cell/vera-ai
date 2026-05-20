"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"
import type { AnswerPreference } from "@/lib/answer-preference"

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
})

const answerPreferenceSchema = z.enum(["short", "long"])

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) return { error: "Failed to update profile" }

  revalidatePath("/dashboard/settings")
  return { success: true }
}

export async function updateAnswerPreference(
  answerPreference: AnswerPreference
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" as const }

  const parsed = answerPreferenceSchema.safeParse(answerPreference)
  if (!parsed.success) {
    return { error: "Invalid answer preference" as const }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      answer_preference: parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { error: "Failed to save preference" as const }
  }

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/chat")

  return {
    success: true as const,
    answerPreference: parsed.data,
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Block password changes for Google users
  const provider = user.app_metadata?.provider as string | undefined
  if (provider === "google")
    return { error: "Google accounts cannot change passwords here" }

  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) return { error: "Failed to update password" }
  return { success: true }
}

export async function uploadAvatar(
  formData: FormData
): Promise<{ error: string } | { success: true; avatarUrl: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Block for Google users — they use their Google avatar automatically
  const provider = user.app_metadata?.provider as string | undefined
  if (provider === "google")
    return { error: "Google accounts use their Google avatar" }

  const file = formData.get("avatar")
  if (!(file instanceof File) || file.size === 0)
    return { error: "No file provided" }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  if (!allowedTypes.includes(file.type)) {
    return { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File too large. Maximum size is 5 MB." }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: "Failed to upload avatar" }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path)

  // Append cache-busting timestamp so the browser refetches the new image
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  revalidatePath("/dashboard/settings")
  return { success: true, avatarUrl }
}

export async function deleteAccount(): Promise<{ error: string } | never> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Delete the profile row first (in case cascade is not set up)
  await supabase.from("profiles").delete().eq("id", user.id)

  // Sign out the current session before deletion
  await supabase.auth.signOut()

  // Delete the auth user via admin API (requires service role)
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(
    user.id
  )
  if (deleteError)
    return { error: "Failed to delete account. Please contact support." }

  redirect("/login")
}
