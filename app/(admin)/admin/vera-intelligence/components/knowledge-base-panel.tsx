import { getAllAgents } from "@/lib/db/admin"
import { filterBuiltinAgentsForLayer } from "@/lib/db/builtin-agent-layer-access"
import { createServiceClient } from "@/lib/supabase/service"
import { KnowledgeBaseUploadCard } from "./knowledge-base-upload-card"
import { LinkAgentForm } from "./link-agent-form"
import { DeleteFileButton, UnlinkButton } from "./kb-file-actions"

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export async function KnowledgeBasePanel() {
  const service = createServiceClient()

  const [allAgents, filesResult, linksResult] = await Promise.all([
    getAllAgents(),
    service
      .from("knowledge_base_files")
      .select("id, name, scope, link_status, size_bytes, created_at")
      .order("created_at", { ascending: false }),
    service
      .from("agent_knowledge_base_files")
      .select("agent_id, file_id, created_at")
      .order("created_at", { ascending: false }),
  ])

  const files = filesResult.data ?? []
  const links = linksResult.data ?? []
  const agents = (
    await filterBuiltinAgentsForLayer(allAgents, "intelligence")
  ).filter((agent) => agent.is_builtin)

  const agentById = new Map(agents.map((agent) => [agent.id, agent]))
  const linksByFileId = new Map<string, typeof links>()

  for (const link of links) {
    const current = linksByFileId.get(link.file_id) ?? []
    current.push(link)
    linksByFileId.set(link.file_id, current)
  }

  return (
    <div className="space-y-5">
      <KnowledgeBaseUploadCard />

      <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
        <p className="text-xs text-muted-foreground">
          {files.length} file{files.length === 1 ? "" : "s"}
        </p>

        {files.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No knowledge files yet. Upload a PDF to get started.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {files.map((file) => {
              const fileLinks = linksByFileId.get(file.id) ?? []

              return (
                <div
                  key={file.id}
                  className="rounded-2xl border border-border/50 bg-background p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size_bytes)} | {file.scope} scope |{" "}
                        {new Date(file.created_at).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Status: {file.link_status}
                      </p>
                    </div>

                    <DeleteFileButton fileId={file.id} fileName={file.name} />
                  </div>

                  <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Link to agent
                    </p>
                    <LinkAgentForm
                      fileId={file.id}
                      agents={agents.map((agent) => ({
                        id: agent.id,
                        name: agent.name,
                        isBuiltin: agent.is_builtin,
                      }))}
                    />
                  </div>

                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                      Linked agents ({fileLinks.length})
                    </p>
                    {fileLinks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No links yet.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {fileLinks.map((link) => {
                          const agent = agentById.get(link.agent_id)

                          return (
                            <div
                              key={`${link.agent_id}-${link.file_id}`}
                              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs"
                            >
                              <span>{agent?.name ?? link.agent_id}</span>
                              <UnlinkButton
                                agentId={link.agent_id}
                                fileId={link.file_id}
                                agentName={agent?.name ?? link.agent_id}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
