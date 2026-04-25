import { getLayerCapabilities } from "@/lib/db/layer-capabilities"
import { LayerCapabilitiesForm } from "./components/layer-capabilities-form"

export default async function VeraCoachEntitlementsPage() {
  const capabilities = await getLayerCapabilities()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Vera Coach Entitlements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure runtime layer capabilities. These settings are persisted in
          system config for server-side gating.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Last updated: {capabilities.updatedAt ?? "Not set yet"}
        </p>
      </div>

      <LayerCapabilitiesForm defaultCapabilities={capabilities.value} />
    </div>
  )
}
