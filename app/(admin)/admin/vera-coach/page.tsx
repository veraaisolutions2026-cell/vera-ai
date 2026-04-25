import Link from "next/link"
import { getLayerCapabilities } from "@/lib/db/layer-capabilities"
import { CoachNavTabs } from "./components/coach-nav-tabs"
import { LayerCapabilitiesForm } from "./entitlements/components/layer-capabilities-form"

export default async function VeraCoachAdminPage() {
  const capabilities = await getLayerCapabilities()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vera Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin structure page for the Vera Coach package. This layer is focused
          on chat and built-in agent usage.
        </p>
      </div>

      <CoachNavTabs
        actionContent={
          <Link
            href="/admin/agents/new?layer=coach"
            className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-3.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            Create Coach Agent
          </Link>
        }
        entitlementsContent={
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Last updated: {capabilities.updatedAt ?? "Not set yet"}
            </p>
            <LayerCapabilitiesForm
              defaultCapabilities={capabilities.value}
              visibleLayers={["coach"]}
            />
          </>
        }
      />
    </div>
  )
}
