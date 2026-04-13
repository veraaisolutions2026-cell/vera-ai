"use client"

import { useActionState } from "react"
import { resetPassword, type AuthState } from "@/actions/auth-actions"
import { Input } from "@/components/ui/input"

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

const initialState: AuthState = {}

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(resetPassword, initialState)

  if (state.success) {
    return (
      <div className="rounded-xl bg-foreground/4 px-5 py-6 text-center ring-1 ring-foreground/9 ring-inset">
        <p className="text-sm font-medium">{state.success}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input
        id="email"
        name="email"
        type="email"
        placeholder="Email address"
        autoComplete="email"
        required
        className="h-11 rounded-xl px-4 text-sm"
        aria-describedby={state.error ? "reset-error" : undefined}
      />

      {state.error && (
        <p id="reset-error" role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
      >
        {isPending && <Spinner />}
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  )
}
