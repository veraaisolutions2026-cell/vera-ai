import { Cta } from "@/app/(marketing)/components/cta"
import { Hero } from "@/app/(marketing)/components/hero"
import { KeyStats } from "@/app/(marketing)/components/key-stats"
import { ValueProposition } from "@/app/(marketing)/components/value-proposition"

export default function Page() {
  return (
    <main>
      <Hero />
      <ValueProposition />
      <KeyStats />
      <Cta />
    </main>
  )
}
