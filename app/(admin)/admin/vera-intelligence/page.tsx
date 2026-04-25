import Link from "next/link"
import { getLayerCapabilities } from "@/lib/db/layer-capabilities"
import { LayerCapabilitiesForm } from "../vera-coach/entitlements/components/layer-capabilities-form"
import { IntelligenceNavTabs } from "./components/intelligence-nav-tabs"
import { AgentLinkingPanel } from "./components/agent-linking-panel"
import { KnowledgeBasePanel } from "./components/knowledge-base-panel"

export default async function VeraIntelligenceAdminPage() {
  const capabilities = await getLayerCapabilities()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Vera Intelligence
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin structure page for the premium layer: advanced agent workflows
          and technical knowledge infrastructure.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            Intelligence Entitlements
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure capabilities shown only for Vera Intelligence users.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last updated: {capabilities.updatedAt ?? "Not set yet"}
          </p>
        </div>
        <LayerCapabilitiesForm
          defaultCapabilities={capabilities.value}
          visibleLayers={["intelligence"]}
        />
      </div>

      <IntelligenceNavTabs
        knowledgeBaseAction={
          <Link
            href="/admin/agents/new?layer=intelligence"
            className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-3.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            Create Intelligence Agent
          </Link>
        }
        agentLinkingAction={
          <Link
            href="/admin/agents/new?layer=intelligence"
            className="inline-flex items-center justify-center rounded-full border border-border/60 bg-background px-3.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            Create Intelligence Agent
          </Link>
        }
        knowledgeBaseContent={<KnowledgeBasePanel />}
        agentLinkingContent={<AgentLinkingPanel />}
      />
    </div>
  )
}
