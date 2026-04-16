"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Loader } from "@/components/ai/loader"
import { cn } from "@/lib/utils"

const SHOW_DELAY_MS = 280
const DASHBOARD_MAIN_ID = "dashboard-main-content"

type NavigationLoaderProps = {
  mode?: "global" | "dashboard"
  sidebarCollapsed?: boolean
}

type Rect = {
  top: number
  left: number
  width: number
  height: number
}

function getMainContentRect(): Rect | null {
  const panel = document.getElementById(DASHBOARD_MAIN_ID)
  if (!panel) return null

  const rect = panel.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

export function NavigationLoader({
  mode = "global",
  sidebarCollapsed = false,
}: NavigationLoaderProps) {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)
  const prevPathRef = useRef(pathname)
  const [panelRect, setPanelRect] = useState<Rect | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const isDashboardRoute = pathname.startsWith("/dashboard")
  const shouldHandleNavigation =
    mode === "dashboard" ? isDashboardRoute : !isDashboardRoute

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      window.setTimeout(() => {
        setIsNavigating(false)
      }, 0)
      prevPathRef.current = pathname
    }
  }, [pathname])

  useEffect(() => {
    if (!shouldHandleNavigation) return

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as HTMLElement).closest("a")
      if (
        anchor?.href &&
        !anchor.target &&
        !anchor.download &&
        anchor.origin === window.location.origin &&
        anchor.pathname !== pathname
      ) {
        if (timeoutRef.current !== null) {
          window.clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = window.setTimeout(() => {
          if (mode === "dashboard" && !sidebarCollapsed) {
            setPanelRect(getMainContentRect())
          }
          setIsNavigating(true)
          timeoutRef.current = null
        }, SHOW_DELAY_MS)
      }
    }
    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("click", handleClick, true)
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [mode, pathname, shouldHandleNavigation, sidebarCollapsed])

  useEffect(() => {
    if (!shouldHandleNavigation) return

    function handleManualNavigationStart() {
      if (mode === "dashboard" && !sidebarCollapsed) {
        setPanelRect(getMainContentRect())
      }

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      setIsNavigating(true)
    }

    window.addEventListener(
      "vera:navigation-loader-start",
      handleManualNavigationStart
    )

    return () => {
      window.removeEventListener(
        "vera:navigation-loader-start",
        handleManualNavigationStart
      )
    }
  }, [mode, shouldHandleNavigation, sidebarCollapsed])

  useEffect(() => {
    if (!isNavigating || mode !== "dashboard" || sidebarCollapsed) return

    function syncRect() {
      setPanelRect(getMainContentRect())
    }

    syncRect()
    window.addEventListener("resize", syncRect)
    return () => window.removeEventListener("resize", syncRect)
  }, [isNavigating, mode, sidebarCollapsed])

  if (!shouldHandleNavigation) return null

  const showFullscreen = mode === "global" || sidebarCollapsed

  return (
    <AnimatePresence>
      {isNavigating ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-none fixed z-9999 flex items-center justify-center bg-background/42 backdrop-blur-[2px]",
            showFullscreen && "inset-0"
          )}
          style={
            showFullscreen || !panelRect
              ? undefined
              : {
                  top: panelRect.top,
                  left: panelRect.left,
                  width: panelRect.width,
                  height: panelRect.height,
                  borderRadius: 16,
                }
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center"
          >
            <Loader size={30} className="text-foreground/75" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
