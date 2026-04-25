import { getResolvedAcaPrompt } from "@/lib/aca-prompt"
import { AcaTabs } from "./components/aca-tabs"

export default async function AcaAdminPage() {
  const config = await getResolvedAcaPrompt()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AcaTabs
        initialPrompt={config.value}
        initialUpdatedAt={config.updatedAt}
        source={config.source}
      />
    </div>
  )
}
