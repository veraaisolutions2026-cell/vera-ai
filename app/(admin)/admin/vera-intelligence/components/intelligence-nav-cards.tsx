import Link from "next/link"
import { ArrowRight } from "lucide-react"

type NavCard = {
  title: string
  description: string
  href: string
}

const navCards: NavCard[] = [
  {
    title: "Knowledge Base",
    description:
      "Shared PDF library structure for admin visibility and future management flows.",
    href: "/admin/vera-intelligence/knowledge-base",
  },
  {
    title: "Agent Linking",
    description:
      "Structure page for mapping shared knowledge files to agents (many-to-many).",
    href: "/admin/vera-intelligence/agent-linking",
  },
]

export function IntelligenceNavCards() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {navCards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group rounded-xl border border-border/60 bg-background p-5 transition-colors hover:border-foreground/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium tracking-tight">
                {card.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {card.description}
              </p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  )
}
