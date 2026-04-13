import Link from "next/link"
import { Plus } from "lucide-react"
import { getAllAgents } from "@/lib/db/admin"
import { AgentsTable } from "./components/agents-table"

export default async function AdminAgentsPage() {
  const agents = await getAllAgents()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {agents.length} system agent{agents.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/agents/new"
          className="flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          New built-in agent
        </Link>
      </div>

      <AgentsTable agents={agents} />
    </div>
  )
}
