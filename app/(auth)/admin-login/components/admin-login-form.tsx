"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import Link from "next/link"
import { toast } from "sonner"
import {
  signInWithGoogleAdmin,
  signInWithEmailAdmin,
  type AuthState,
} from "@/actions/auth-actions"
import { Input } from "@/components/ui/input"

const initialState: AuthState = {}

const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}
const fadeTransition = { duration: 0.18, ease: "easeInOut" as const }

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
  )
}

function GoogleSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-foreground/6 px-5 text-sm font-medium text-foreground ring-1 ring-foreground/9 transition-colors ring-inset hover:bg-foreground/9 disabled:opacity-70"
    >
      {pending ? <Spinner /> : <GoogleIcon />}
      Continue with Google
    </button>
  )
}

export function AdminLoginForm() {
  const [showEmail, setShowEmail] = useState(false)
  const [state, action, isPending] = useActionState(
    signInWithEmailAdmin,
    initialState
  )
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "not_admin") {
      toast.error(
        "Access denied. That Google account does not have admin access."
      )
    } else if (error === "oauth_failed") {
      toast.error("Sign-in failed. Please try again.")
    }
  }, [searchParams])

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!showEmail ? (
        <motion.div
          key="initial"
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={fadeTransition}
          className="flex flex-col gap-3"
        >
          <form action={signInWithGoogleAdmin}>
            <GoogleSubmitButton />
          </form>

          <div className="flex items-center gap-3 py-0.5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="h-11 rounded-full bg-foreground/6 px-5 text-sm font-medium text-foreground ring-1 ring-foreground/9 transition-colors ring-inset hover:bg-foreground/9"
          >
            Continue with email
          </button>

          <p className="text-center text-xs text-muted-foreground/50">
            Admin access only. Unauthorised accounts will be blocked.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="email"
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={fadeTransition}
          className="flex flex-col gap-3"
        >
          <form action={action} className="flex flex-col gap-3">
            <Input
              id="admin-email"
              name="email"
              type="email"
              placeholder="Admin email address"
              autoComplete="email"
              required
              className="h-11 rounded-xl px-4 text-sm"
              aria-describedby={state.error ? "admin-login-error" : undefined}
            />

            <div className="flex flex-col gap-1.5">
              <Input
                id="admin-password"
                name="password"
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
                className="h-11 rounded-xl px-4 text-sm"
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {state.error && (
              <p
                id="admin-login-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {isPending && <Spinner />}
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowEmail(false)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Other sign-in options
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
