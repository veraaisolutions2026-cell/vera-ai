import { getResolvedAcaPrompt } from "@/lib/aca-prompt"
import { AcaManager } from "./components/aca-manager"

export default async function AcaAdminPage() {
  const config = await getResolvedAcaPrompt()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Agent Creator - Travers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the Travers Master File — the core system prompt that powers
          the user-facing Agent Builder. All agents created by users are
          scaffolded using this specification.
        </p>
      </div>

      <AcaManager
        initialPrompt={config.value}
        initialUpdatedAt={config.updatedAt}
        source={config.source}
      />
    </div>
  )
}
