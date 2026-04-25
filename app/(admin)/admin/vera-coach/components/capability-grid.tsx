import Link from "next/link"
import { ArrowRight } from "lucide-react"

type Capability = {
  title: string
  description: string
  href: string
}

const capabilities: Capability[] = [
  {
    title: "Coach Entitlements",
    description:
      "Define what Vera Coach includes: chat, built-in agents, and restricted access points.",
    href: "/admin/vera-coach/entitlements",
  },
]

export function CapabilityGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {capabilities.map((capability) => (
        <Link
          key={capability.href}
          href={capability.href}
          className="group rounded-xl border border-border/60 bg-background p-5 transition-colors hover:border-foreground/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium tracking-tight">
                {capability.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {capability.description}
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  )
}
