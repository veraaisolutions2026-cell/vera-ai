import { Suspense } from "react"
import Link from "next/link"
import { AuthHeader } from "@/app/(auth)/components/auth-header"
import { RegisterForm } from "./components/register-form"

export default function RegisterPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8 px-4">
      <AuthHeader title="Create your account" />
      <Suspense>
        <RegisterForm />
      </Suspense>
      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link
            href="/legal/terms-of-service"
            className="underline-offset-4 hover:underline"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/legal/privacy-policy"
            className="underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
