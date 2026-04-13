import { AgentForm } from "../components/agent-form"

export default function NewAgentPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New built-in agent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new system agent for all users. Import a system prompt from a
          PDF or DOCX file, or write it manually.
        </p>
      </div>
      <AgentForm mode="create" />
    </div>
  )
}
