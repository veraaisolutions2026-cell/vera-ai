import {
  deleteKnowledgeBaseFileAction,
  linkKnowledgeBaseFileToAgentAction,
  unlinkKnowledgeBaseFileFromAgentAction,
  uploadKnowledgeBasePdfAction,
} from "@/actions/admin-kb-actions"
import { getAllAgents } from "@/lib/db/admin"
import { createServiceClient } from "@/lib/supabase/service"

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default async function AdminKnowledgeBasePage() {
  const service = createServiceClient()

  const [agents, filesResult, linksResult] = await Promise.all([
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

  const agentById = new Map(agents.map((agent) => [agent.id, agent]))
  const linksByFileId = new Map<string, typeof links>()

  for (const link of links) {
    const current = linksByFileId.get(link.file_id) ?? []
    current.push(link)
    linksByFileId.set(link.file_id, current)
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Knowledge Base (Admin)
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload, inspect, link, and delete shared PDF knowledge assets.
        </p>
      </div>

      <form
        action={uploadKnowledgeBasePdfAction}
        className="rounded-xl border border-border/60 bg-background p-5"
      >
        <h2 className="text-base font-medium">Upload PDF</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Files are stored in the private knowledge-base-files bucket.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            name="file"
            accept="application/pdf"
            required
            className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background hover:file:opacity-90"
          />
          <button
            type="submit"
            className="rounded-full border border-border/70 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Upload
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-border/60 bg-background p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium">Shared PDF Library</h2>
          <p className="text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"}
          </p>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No knowledge files yet. Upload a PDF to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => {
              const fileLinks = linksByFileId.get(file.id) ?? []

              return (
                <div
                  key={file.id}
                  className="rounded-lg border border-border/60 p-4"
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

                    <form action={deleteKnowledgeBaseFileAction}>
                      <input type="hidden" name="fileId" value={file.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                      >
                        Delete file
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 rounded-md border border-border/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Link to agent
                    </p>
                    <form
                      action={linkKnowledgeBaseFileToAgentAction}
                      className="mt-2 flex flex-col gap-2 sm:flex-row"
                    >
                      <input type="hidden" name="fileId" value={file.id} />
                      <select
                        name="agentId"
                        required
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select agent
                        </option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                            {agent.is_builtin ? " (built-in)" : " (custom)"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                      >
                        Attach
                      </button>
                    </form>
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
                            <form
                              key={`${link.agent_id}-${link.file_id}`}
                              action={unlinkKnowledgeBaseFileFromAgentAction}
                              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs"
                            >
                              <input
                                type="hidden"
                                name="fileId"
                                value={link.file_id}
                              />
                              <input
                                type="hidden"
                                name="agentId"
                                value={link.agent_id}
                              />
                              <span>{agent?.name ?? link.agent_id}</span>
                              <button
                                type="submit"
                                className="text-destructive hover:underline"
                              >
                                Unlink
                              </button>
                            </form>
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
