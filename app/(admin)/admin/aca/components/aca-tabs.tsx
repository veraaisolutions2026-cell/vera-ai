"use client"

import { useState } from "react"
import { AcaManager } from "./aca-manager"
import { AdminTraversChat } from "./admin-travers-chat"
import { cn } from "@/lib/utils"

type Props = {
  initialPrompt: string
  initialUpdatedAt: string | null
  source: "configured" | "default"
}

export function AcaTabs({ initialPrompt, initialUpdatedAt, source }: Props) {
  const [activeTab, setActiveTab] = useState<"master-prompt" | "travers">(
    "master-prompt"
  )

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Page header + tab switcher */}
      <div className="shrink-0 px-4 pt-4 pb-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Agent Creator — Travers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the Travers Master Prompt that powers the agent builder, or use
          Travers directly to design and create agents.
        </p>
        <div className="mt-4 inline-flex items-center rounded-full border border-border/60 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("master-prompt")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === "master-prompt"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Master Prompt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("travers")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeTab === "travers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Travers
          </button>
        </div>
      </div>

      {/* Render one panel at a time to keep views fully separate */}
      {activeTab === "master-prompt" ? (
        <div className="flex-1 overflow-y-auto px-4 pb-8 sm:px-6 lg:px-8">
          <AcaManager
            initialPrompt={initialPrompt}
            initialUpdatedAt={initialUpdatedAt}
            source={source}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <AdminTraversChat />
        </div>
      )}
    </div>
  )
}
