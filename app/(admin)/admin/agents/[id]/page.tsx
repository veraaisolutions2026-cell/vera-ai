import { notFound } from "next/navigation"
import { getAgent } from "@/lib/db/agents"
import { getBuiltinAgentLayers } from "@/lib/db/builtin-agent-layer-access"
import { AgentForm } from "../components/agent-form"

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [agent, layers] = await Promise.all([
    getAgent(id),
    getBuiltinAgentLayers(id),
  ])

  if (!agent) notFound()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit built-in agent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update system agent details, prompt, and layer access.
        </p>
      </div>
      <AgentForm mode="edit" agent={agent} initialLayers={layers} />
    </div>
  )
}
