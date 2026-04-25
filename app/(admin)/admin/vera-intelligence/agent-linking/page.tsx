import { getAllAgents } from "@/lib/db/admin"
import { createServiceClient } from "@/lib/supabase/service"

export default async function AdminAgentLinkingPage() {
  const service = createServiceClient()

  const [agents, filesResult, linksResult] = await Promise.all([
    getAllAgents(),
    service.from("knowledge_base_files").select("id, name"),
    service
      .from("agent_knowledge_base_files")
      .select("agent_id, file_id, created_at")
      .order("created_at", { ascending: false }),
  ])

  const files = filesResult.data ?? []
  const links = linksResult.data ?? []

  const agentById = new Map(agents.map((agent) => [agent.id, agent]))
  const fileById = new Map(files.map((file) => [file.id, file]))

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Linking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect current many-to-many links between agents and shared PDFs.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-background p-5">
        <p className="text-sm text-muted-foreground">
          {links.length} active link{links.length === 1 ? "" : "s"}
        </p>

        {links.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No links yet. Use the Knowledge Base page to attach files to agents.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Agent</th>
                  <th className="px-4 py-2.5 font-medium">File</th>
                  <th className="px-4 py-2.5 font-medium">Linked at</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr
                    key={`${link.agent_id}-${link.file_id}`}
                    className="border-t border-border/50"
                  >
                    <td className="px-4 py-2.5">
                      {agentById.get(link.agent_id)?.name ?? link.agent_id}
                    </td>
                    <td className="px-4 py-2.5">
                      {fileById.get(link.file_id)?.name ?? link.file_id}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(link.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
