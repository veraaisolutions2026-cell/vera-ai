"use client"

import { ViewTransition } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative flex-1 overflow-hidden">
      <ViewTransition key={pathname} default="page-fade">
        <div className="flex h-full flex-col overflow-auto">{children}</div>
      </ViewTransition>
    </div>
  )
}
