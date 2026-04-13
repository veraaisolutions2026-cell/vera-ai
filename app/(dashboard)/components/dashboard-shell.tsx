"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Sidebar } from "./sidebar"
import { PageTransition } from "./page-transition"
import type { Chat, UserData } from "@/types/database"

type Props = {
  user: UserData
  chats: Chat[]
  children: React.ReactNode
}

export function DashboardShell({ user, chats, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="relative flex h-svh overflow-hidden bg-background">
      {/* Sidebar with animated width */}
      <motion.div
        animate={{ width: sidebarOpen ? 240 : 52 }}
        initial={false}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="shrink-0 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sidebarOpen ? "expanded" : "collapsed"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="w-60"
          >
            <Sidebar
              user={user}
              chats={chats}
              onCollapse={() => setSidebarOpen(false)}
              onExpand={() => setSidebarOpen(true)}
              collapsed={!sidebarOpen}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Main content */}
      <main className="mx-4 my-4 flex flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
