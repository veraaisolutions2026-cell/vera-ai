"use client"

import { useTransition } from "react"
import { Lock, Loader2, Eye, EyeOff, Info } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { updatePassword } from "@/actions/settings-actions"

type Props = {
  provider: string
}

export function SecuritySettings({ provider }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const isGoogleUser = provider === "google"

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const form = e.currentTarget
    startTransition(async () => {
      const result = await updatePassword(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Password updated")
        form.reset()
      }
    })
  }

  return (
    <section className="rounded-xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
      <div className="border-b border-border/50 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/6 text-foreground/70">
            <Lock className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm leading-none font-semibold">Security</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isGoogleUser ? "Managed by Google" : "Change your password"}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        {isGoogleUser ? (
          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
            <div>
              <p className="text-sm font-medium">Google account</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your account uses Google to sign in. Password and security
                settings are managed through your Google account.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="h-10 w-full rounded-lg border border-border/60 bg-background px-3 pr-10 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  {showPw ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Repeat password"
                  className="h-10 w-full rounded-lg border border-border/60 bg-background px-3 pr-10 text-sm transition-colors outline-none focus:border-foreground/40 focus:ring-1 focus:ring-foreground/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  {showConfirm ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex h-9 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Update password
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
