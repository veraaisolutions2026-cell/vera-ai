import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { VeraLogo } from "@/components/ui/vera-logo"

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Go to homepage" className="shrink-0">
            <VeraLogo width={96} height={26} priority variant="wide" />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ModeToggle />
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <span className="font-mono text-xs text-muted-foreground">
            — Footer —
          </span>
        </div>
      </footer>
    </div>
  )
}
