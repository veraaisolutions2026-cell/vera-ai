import { Suspense } from "react"
import { AuthHeader } from "@/app/(auth)/components/auth-header"
import { AdminLoginForm } from "./components/admin-login-form"

export default function AdminLoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8 px-4">
      <AuthHeader title="Log in to Vera AI as Admin" />
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </div>
  )
}
