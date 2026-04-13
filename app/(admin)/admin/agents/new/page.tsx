import { AgentForm } from "../components/agent-form"

export default function NewAgentPage() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new AI agent. Import a system prompt from a PDF or DOCX file,
          or write it manually.
        </p>
      </div>
      <AgentForm mode="create" />
    </div>
  )
}
