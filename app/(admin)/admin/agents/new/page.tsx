import { AgentForm } from "../components/agent-form"

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ layer?: string }>
}) {
  const { layer } = await searchParams

  const initialLayers =
    layer === "coach"
      ? (["coach"] as const)
      : layer === "intelligence"
        ? (["intelligence"] as const)
        : (["coach", "intelligence"] as const)

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New built-in agent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new system agent and choose which layer can access it.
        </p>
      </div>
      <AgentForm mode="create" initialLayers={initialLayers} />
    </div>
  )
}
