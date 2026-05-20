"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import { Menu, X } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { VeraLogo } from "@/components/ui/vera-logo"

const NAV_LINKS = [
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()

  // Total height at rest: paddingY(8) * 2 + innerHeight(68) = 84px
  // Total height when sticky: paddingY(0) + innerHeight(56) = 56px
  const rawProgress = useTransform(scrollY, [0, 60], [0, 1], { clamp: true })
  const progress = useSpring(rawProgress, {
    stiffness: 420,
    damping: 42,
    mass: 0.75,
  })

  const bgOpacity = useTransform(progress, [0, 1], [0, 0.88])
  const paddingY = useTransform(progress, [0, 1], [8, 0])
  const innerHeight = useTransform(progress, [0, 1], [68, 56])

  return (
    <>
      <motion.header
        className="sticky top-0 z-50"
        style={{ paddingTop: paddingY, paddingBottom: paddingY }}
      >
        {/* Animated blur/tint background */}
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 backdrop-blur-xl"
          style={{
            opacity: bgOpacity,
            backgroundColor: "var(--background)",
          }}
        />

        <motion.div
          className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6"
          style={{ height: innerHeight }}
        >
          <Link href="/" aria-label="Go to homepage" className="shrink-0">
            <VeraLogo width={130} height={40} priority variant="wide" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-0.5 sm:gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}

            <div className="mx-1.5 h-4 w-px bg-border" />

            <ModeToggle />

            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile right side */}
          <div className="flex items-center gap-1 lg:hidden">
            <ModeToggle />
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              className="fixed top-0 right-0 z-50 flex h-full w-72 flex-col bg-background shadow-xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 40,
                mass: 0.8,
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.25 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 72) setMobileOpen(false)
              }}
            >
              {/* Drawer header */}
              <div className="flex h-16 items-center justify-between border-b border-border/50 px-5">
                <VeraLogo width={80} height={22} variant="wide" />
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/6 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer links */}
              <nav className="flex flex-col gap-1 p-4">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.06 + i * 0.04,
                      type: "spring",
                      stiffness: 400,
                      damping: 38,
                    }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex h-11 items-center rounded-xl px-4 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/6 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Drawer footer auth */}
              <div className="mt-auto flex flex-col gap-2 border-t border-border/50 p-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/6 hover:text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-85"
                >
                  Sign up
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
