import Link from "next/link"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getBuiltinAgents, getUserAgents } from "@/lib/db/agents"
import { AgentCard } from "./components/agent-card"

export const metadata = {
  title: "Agents — Vera AI",
}

export default async function AgentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [builtinAgents, userAgents] = await Promise.all([
    getBuiltinAgents(),
    getUserAgents(user.id),
  ])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse built-in agents or create your own custom agents.
          </p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create agent
        </Link>
      </div>

      {/* My agents */}
      {userAgents.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            My Agents ({userAgents.length})
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {userAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} editable />
            ))}
          </div>
        </section>
      )}

      {/* Built-in agents */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Built-in Agents ({builtinAgents.length})
        </h2>
        {builtinAgents.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No built-in agents configured yet. Ask your admin to set them up.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {builtinAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} editable={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
