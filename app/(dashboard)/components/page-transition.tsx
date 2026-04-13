"use client"

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex-1 overflow-hidden">
      <div className="flex h-full flex-col overflow-auto">{children}</div>
    </div>
  )
}
