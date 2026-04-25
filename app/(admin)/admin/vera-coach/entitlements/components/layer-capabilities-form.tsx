"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { updateLayerCapabilitiesAction } from "@/actions/admin-layer-actions"
import { Switch } from "@/components/animate-ui/components/radix/switch"
import type { LayerCapabilities } from "@/lib/db/layer-capabilities"

type CapabilitySwitchProps = {
  title: string
  description: string
  value: boolean
  onChange: (value: boolean) => void
}

function CapabilitySwitch({
  title,
  description,
  value,
  onChange,
}: CapabilitySwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} aria-label={title} />
    </div>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save capability rules"}
    </button>
  )
}

type Props = {
  defaultCapabilities: LayerCapabilities
  visibleLayers?: Array<"coach" | "intelligence">
}

export function LayerCapabilitiesForm({
  defaultCapabilities,
  visibleLayers = ["coach", "intelligence"],
}: Props) {
  const [coachAllowBuiltInAgents, setCoachAllowBuiltInAgents] = useState(
    defaultCapabilities.coach.allowBuiltInAgents
  )
  const [coachAllowCustomAgentCrud, setCoachAllowCustomAgentCrud] = useState(
    defaultCapabilities.coach.allowCustomAgentCrud
  )
  const [
    coachAllowKnowledgeBaseManagement,
    setCoachAllowKnowledgeBaseManagement,
  ] = useState(defaultCapabilities.coach.allowKnowledgeBaseManagement)

  const [intelligenceAllowBuiltInAgents, setIntelligenceAllowBuiltInAgents] =
    useState(defaultCapabilities.intelligence.allowBuiltInAgents)
  const [
    intelligenceAllowCustomAgentCrud,
    setIntelligenceAllowCustomAgentCrud,
  ] = useState(defaultCapabilities.intelligence.allowCustomAgentCrud)
  const [
    intelligenceAllowKnowledgeBaseManagement,
    setIntelligenceAllowKnowledgeBaseManagement,
  ] = useState(defaultCapabilities.intelligence.allowKnowledgeBaseManagement)

  const showCoach = visibleLayers.includes("coach")
  const showIntelligence = visibleLayers.includes("intelligence")

  return (
    <form action={updateLayerCapabilitiesAction} className="space-y-6">
      <input
        type="hidden"
        name="coachAllowBuiltInAgents"
        value={coachAllowBuiltInAgents ? "on" : "off"}
      />
      <input
        type="hidden"
        name="coachAllowCustomAgentCrud"
        value={coachAllowCustomAgentCrud ? "on" : "off"}
      />
      <input
        type="hidden"
        name="coachAllowKnowledgeBaseManagement"
        value={coachAllowKnowledgeBaseManagement ? "on" : "off"}
      />
      <input
        type="hidden"
        name="intelligenceAllowBuiltInAgents"
        value={intelligenceAllowBuiltInAgents ? "on" : "off"}
      />
      <input
        type="hidden"
        name="intelligenceAllowCustomAgentCrud"
        value={intelligenceAllowCustomAgentCrud ? "on" : "off"}
      />
      <input
        type="hidden"
        name="intelligenceAllowKnowledgeBaseManagement"
        value={intelligenceAllowKnowledgeBaseManagement ? "on" : "off"}
      />

      {showCoach ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Vera Coach
          </h2>
          <CapabilitySwitch
            title="Allow built-in agents"
            description="Controls whether Coach users can select built-in agents in chat."
            value={coachAllowBuiltInAgents}
            onChange={setCoachAllowBuiltInAgents}
          />
          <CapabilitySwitch
            title="Allow custom agent create/edit"
            description="If disabled, Coach users cannot create, edit, or delete custom agents."
            value={coachAllowCustomAgentCrud}
            onChange={setCoachAllowCustomAgentCrud}
          />
          <CapabilitySwitch
            title="Allow knowledge-base management"
            description="If disabled, Coach users cannot access file and KB management routes."
            value={coachAllowKnowledgeBaseManagement}
            onChange={setCoachAllowKnowledgeBaseManagement}
          />
        </section>
      ) : null}

      {showIntelligence ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Vera Intelligence
          </h2>
          <CapabilitySwitch
            title="Allow built-in agents"
            description="Controls built-in agent availability for Intelligence users."
            value={intelligenceAllowBuiltInAgents}
            onChange={setIntelligenceAllowBuiltInAgents}
          />
          <CapabilitySwitch
            title="Allow custom agent create/edit"
            description="If disabled, custom agent CRUD is blocked for Intelligence users."
            value={intelligenceAllowCustomAgentCrud}
            onChange={setIntelligenceAllowCustomAgentCrud}
          />
          <CapabilitySwitch
            title="Allow knowledge-base management"
            description="If disabled, Intelligence users cannot access KB management workflows."
            value={intelligenceAllowKnowledgeBaseManagement}
            onChange={setIntelligenceAllowKnowledgeBaseManagement}
          />
        </section>
      ) : null}

      <SaveButton />
    </form>
  )
}
