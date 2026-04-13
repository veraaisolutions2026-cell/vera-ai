"use client"

export function RouteTransition({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col overflow-auto">{children}</div>
}
