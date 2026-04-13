"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Loader } from "@/components/ai/loader"

export function NavigationLoader() {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)

  useEffect(() => {
    if (pathname !== prevPath) {
      setIsNavigating(false)
      setPrevPath(pathname)
    }
  }, [pathname, prevPath])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a")
      if (
        anchor?.href &&
        !anchor.target &&
        !anchor.download &&
        anchor.origin === window.location.origin &&
        anchor.pathname !== pathname
      ) {
        setIsNavigating(true)
      }
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [pathname])

  if (!isNavigating) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-9999 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Loader size={28} className="text-foreground/70" />
    </div>
  )
}
