"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { Eye, EyeOff, Check, X } from "lucide-react"
import {
  signInWithGoogle,
  signUpWithEmail,
  type AuthState,
} from "@/actions/auth-actions"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const initialState: AuthState = {}

const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}
const fadeTransition = { duration: 0.18, ease: "easeInOut" as const }

/* ── Spinner ─────────────────────────────────────────────── */

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

/* ── Google icon ─────────────────────────────────────────── */

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

/* Google button uses useFormStatus so it reacts to its own form pending state */
function GoogleSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-foreground/6 px-5 text-sm font-medium text-foreground ring-1 ring-foreground/9 transition-colors ring-inset hover:bg-foreground/9 disabled:opacity-60"
    >
      {pending ? <Spinner /> : <GoogleIcon />}
      Sign up with Google
    </button>
  )
}

/* ── Password strength ───────────────────────────────────── */

type Rule = { label: string; test: (pw: string) => boolean }

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

function getStrength(pw: string) {
  return RULES.filter((r) => r.test(pw)).length
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"]
const STRENGTH_COLORS = [
  "",
  "bg-destructive",
  "bg-amber-500",
  "bg-yellow-400",
  "bg-emerald-500",
]
const STRENGTH_TEXT = [
  "",
  "text-destructive",
  "text-amber-500",
  "text-yellow-500",
  "text-emerald-500",
]

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score = getStrength(password)

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className="space-y-2.5"
    >
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((seg) => (
            <motion.div
              key={seg}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                score >= seg ? STRENGTH_COLORS[score] : "bg-foreground/10"
              )}
            />
          ))}
        </div>
        {score > 0 && (
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              STRENGTH_TEXT[score]
            )}
          >
            {STRENGTH_LABELS[score]}
          </span>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {RULES.map((rule) => {
          const passed = rule.test(password)
          return (
            <li key={rule.label} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                  passed
                    ? "bg-emerald-500/20 text-emerald-500"
                    : "bg-foreground/8 text-muted-foreground/40"
                )}
              >
                {passed ? (
                  <Check className="h-2 w-2" strokeWidth={3} />
                ) : (
                  <X className="h-2 w-2" strokeWidth={3} />
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] transition-colors duration-200",
                  passed ? "text-foreground/70" : "text-muted-foreground/50"
                )}
              >
                {rule.label}
              </span>
            </li>
          )
        })}
      </ul>
    </motion.div>
  )
}

function ConfirmMatch({
  password,
  confirm,
}: {
  password: string
  confirm: string
}) {
  if (!confirm) return null
  const match = password === confirm
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-1 text-[11px]",
        match ? "text-emerald-500" : "text-destructive"
      )}
    >
      {match ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : (
        <X className="h-3 w-3" strokeWidth={3} />
      )}
      {match ? "Passwords match" : "Passwords do not match"}
    </motion.p>
  )
}

/* ── Main component ──────────────────────────────────────── */

export function RegisterForm() {
  const [showEmail, setShowEmail] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [state, action, isPending] = useActionState(
    signUpWithEmail,
    initialState
  )

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.success ? (
        <motion.div
          key="success"
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={fadeTransition}
          className="rounded-xl bg-foreground/4 px-5 py-6 text-center ring-1 ring-foreground/9 ring-inset"
        >
          <p className="text-sm font-medium">{state.success}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </motion.div>
      ) : !showEmail ? (
        <motion.div
          key="initial"
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={fadeTransition}
          className="flex flex-col gap-3"
        >
          <form action={signInWithGoogle}>
            <GoogleSubmitButton />
          </form>

          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="h-11 rounded-full bg-foreground/6 px-5 text-sm font-medium text-foreground ring-1 ring-foreground/9 transition-colors ring-inset hover:bg-foreground/9"
          >
            Continue with email
          </button>
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
              id="name"
              name="name"
              type="text"
              placeholder="Full name"
              autoComplete="name"
              required
              className="h-11 rounded-xl px-4 text-sm"
              aria-describedby={state.error ? "register-error" : undefined}
            />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              className="h-11 rounded-xl px-4 text-sm"
            />

            {/* Password + strength */}
            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl px-4 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {password && <PasswordStrength password={password} />}
              </AnimatePresence>
            </div>

            {/* Confirm password + match */}
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 rounded-xl px-4 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {confirm && (
                  <ConfirmMatch password={password} confirm={confirm} />
                )}
              </AnimatePresence>
            </div>

            {state.error && (
              <p
                id="register-error"
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
              {isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowEmail(false)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Other sign-up options
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
