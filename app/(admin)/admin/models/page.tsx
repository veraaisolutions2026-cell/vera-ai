import { Badge } from "@/components/ui/badge"
import { getAIProviderAvailability } from "@/lib/ai-provider"
import {
  DEFAULT_CHAT_MODEL_ID,
  FALLBACK_MODELS,
  getModelOption,
} from "@/lib/models"

export default function AdminModelsPage() {
  const availability = getAIProviderAvailability()
  const providerMode = process.env.VERA_AI_PROVIDER_MODE?.trim() || "gateway"
  const defaultChatModel =
    getModelOption(DEFAULT_CHAT_MODEL_ID) ?? FALLBACK_MODELS[0]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:gap-8 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only view of the live Vera AI model routing and fallback stack.
          </p>
        </div>

        <Badge
          variant="outline"
          className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-muted-foreground"
        >
          Read only
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-background p-5">
          <p className="text-sm text-muted-foreground">Provider mode</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight capitalize">
            {providerMode}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-5">
          <p className="text-sm text-muted-foreground">Gateway status</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {availability.gatewayConfigured ? "Configured" : "Missing key"}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-5">
          <p className="text-sm text-muted-foreground">Deployed tiers</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {FALLBACK_MODELS.length}
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background p-5">
          <p className="text-sm text-muted-foreground">Default chat tier</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {defaultChatModel.fullLabel}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tier routing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Primary Claude models are paired with Google fallbacks and routed
            through Vercel AI Gateway for autonomous failover.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {FALLBACK_MODELS.map((model) => (
            <div
              key={model.id}
              className="rounded-2xl border border-border/60 bg-background p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-foreground">
                    {model.fullLabel}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {model.description}
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5"
                >
                  v{model.version}
                </Badge>
              </div>

              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Primary model
                  </p>
                  <p className="mt-1 font-mono text-xs text-foreground">
                    {model.gatewayModelId}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Fallback model
                  </p>
                  <p className="mt-1 font-mono text-xs text-foreground">
                    {model.fallbackGatewayModelIds.join(", ")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2.5 py-0.5"
                  >
                    {model.supportsThinking
                      ? "Adaptive thinking on"
                      : "Adaptive thinking off"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full px-2.5 py-0.5"
                  >
                    Non-customizable
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
