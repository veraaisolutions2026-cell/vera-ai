import { ModeToggle } from "@/components/mode-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative grid min-h-svh place-items-center bg-background px-4 py-16 dark:[background:linear-gradient(180deg,#0f0f11_0%,#090909_100%)]">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      {children}
    </div>
  )
}
