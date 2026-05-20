import { SmoothScrollProvider } from "@/components/smooth-scroll-provider"
import { Header } from "./components/header"
import { Footer } from "./components/footer"

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SmoothScrollProvider />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
