import Link from "next/link"
import { AuthHeader } from "@/app/(auth)/components/auth-header"
import { ForgotPasswordForm } from "./components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8 px-4">
      <AuthHeader title="Reset your password" />
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      </p>
    </div>
  )
}
