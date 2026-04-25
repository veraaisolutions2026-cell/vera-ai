"use client"

import { useState } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { NavigationLoader } from "@/components/navigation-loader"
import { RouteTransition } from "@/components/route-transition"
import { cn } from "@/lib/utils"
import type { LayerAccess } from "@/lib/db/layer-access"
import { Sidebar } from "./sidebar"
import type { Chat, UserData } from "@/types/database"

type Props = {
  user: UserData
  chats: Chat[]
  layerAccess: LayerAccess
  children: React.ReactNode
}

export function DashboardShell({ user, chats, layerAccess, children }: Props) {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="relative flex h-svh overflow-hidden bg-background">
      <button
        onClick={() => setMobileSidebarOpen((open) => !open)}
        className="fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground md:hidden"
        aria-label="Toggle dashboard navigation"
      >
        {mobileSidebarOpen ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </button>

      <div
        onClick={() => setMobileSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/45 transition-opacity md:hidden",
          mobileSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 transition-transform duration-200 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onClickCapture={(event) => {
          const target = event.target as HTMLElement
          if (target.closest("a")) {
            setMobileSidebarOpen(false)
          }
        }}
      >
        <Sidebar
          user={user}
          chats={chats}
          layerAccess={layerAccess}
          onCollapse={() => setMobileSidebarOpen(false)}
          onExpand={() => setMobileSidebarOpen(true)}
          collapsed={false}
        />
      </div>

      {/* Sidebar with animated width */}
      <motion.div
        animate={{ width: desktopSidebarOpen ? 240 : 52 }}
        initial={false}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="hidden shrink-0 overflow-hidden md:block"
        style={{ minWidth: 0 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={desktopSidebarOpen ? "expanded" : "collapsed"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="w-60"
          >
            <Sidebar
              user={user}
              chats={chats}
              layerAccess={layerAccess}
              onCollapse={() => setDesktopSidebarOpen(false)}
              onExpand={() => setDesktopSidebarOpen(true)}
              collapsed={!desktopSidebarOpen}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Main content */}
      <main
        id="dashboard-main-content"
        className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background pt-12 md:mx-4 md:my-4 md:rounded-2xl md:bg-card md:pt-0 md:shadow-sm md:ring-1 md:ring-border"
      >
        <RouteTransition>{children}</RouteTransition>
      </main>

      <NavigationLoader
        mode="dashboard"
        sidebarCollapsed={!desktopSidebarOpen}
      />
    </div>
  )
}
