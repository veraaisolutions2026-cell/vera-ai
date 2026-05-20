"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { User, Mail, Camera, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { updateProfile, uploadAvatar } from "@/actions/settings-actions"
import { cn } from "@/lib/utils"
import type { UserData } from "@/types/database"

type Props = {
  user: UserData
}

export function ProfileSettings({ user }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)

  const isGoogleUser = user.provider === "google"

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Profile updated")
      }
    })
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setAvatarUrl(objectUrl)
    setIsUploading(true)

    const formData = new FormData()
    formData.set("avatar", file)
    const result = await uploadAvatar(formData)

    setIsUploading(false)
    if ("error" in result) {
      toast.error(result.error)
      setAvatarUrl(user.avatarUrl) // revert
    } else {
      toast.success("Avatar updated")
      setAvatarUrl(result.avatarUrl)
    }

    // Reset file input so the same file can be re-selected
    e.target.value = ""
  }

  return (
    <section className="rounded-xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
      <div className="border-b border-border/50 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/6 text-foreground/70">
            <User className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm leading-none font-semibold">Profile</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Update your display name{!isGoogleUser ? " and avatar" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Avatar row */}
        <div className="mb-5 flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/10 text-lg font-semibold tracking-tight">
                {initials}
              </div>
            )}

            {/* Upload overlay — email users only */}
            {!isGoogleUser && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100",
                    isUploading && "opacity-100"
                  )}
                  aria-label="Upload avatar"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>

          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {!isGoogleUser && (
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Click avatar to upload a photo (max 5 MB)
              </p>
            )}
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="full_name"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              defaultValue={user.name}
              required
              disabled={isGoogleUser}
              className={cn(
                "h-10 w-full rounded-lg border px-3 text-sm transition-colors outline-none",
                isGoogleUser
                  ? "cursor-not-allowed border-border/40 bg-muted/50 text-muted-foreground"
                  : "border-border/60 bg-background focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
              )}
            />
            {isGoogleUser && (
              <div className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground/60">
                  Your name is managed by Google and cannot be changed here.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="h-10 w-full cursor-not-allowed rounded-lg border border-border/40 bg-muted/50 pr-3 pl-8 text-sm text-muted-foreground"
              />
            </div>
            {isGoogleUser ? (
              <div className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground/60">
                  Your account is managed by Google. Email changes require
                  re-authentication via Google.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">
                To change your email, contact support.
              </p>
            )}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isPending || isGoogleUser}
              className="flex h-9 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
