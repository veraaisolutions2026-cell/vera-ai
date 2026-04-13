import { Cta } from "./components/cta"
import { Hero } from "./components/hero"
import { KeyStats } from "./components/key-stats"
import { ValueProposition } from "./components/value-proposition"

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
