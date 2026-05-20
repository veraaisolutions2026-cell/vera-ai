import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"

export const metadata: Metadata = {
  title: "Vera AI",
  description: "AI-powered auditing workspace",
}
import { ThemeProvider } from "@/components/theme-provider"
import { NavigationLoader } from "@/components/navigation-loader"
import { Toaster } from "@/components/toaster"
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <SmoothScrollProvider />
          {children}
          <NavigationLoader />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
