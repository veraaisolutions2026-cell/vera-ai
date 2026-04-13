import { AgentBuilder } from "./components/agent-builder"

export const metadata = {
  title: "Create Agent — Vera AI",
}

export default function NewAgentPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AgentBuilder />
    </div>
  )
}
