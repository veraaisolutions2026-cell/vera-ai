import { Suspense } from "react"
import Link from "next/link"
import { AuthHeader } from "@/app/(auth)/components/auth-header"
import { LoginForm } from "./components/login-form"

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8 px-4">
      <AuthHeader title="Start your audit" />
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
