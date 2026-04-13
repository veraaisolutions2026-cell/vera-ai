export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <span className="font-mono text-xs text-muted-foreground">
            — MarketingNav —
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            — NavActions —
          </span>
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
