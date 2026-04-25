"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { showUsageUpsellToast } from "@/lib/usage-upsell-toast"
import type { PlanId } from "@/lib/billing-plans"

type Props = {
  plan: PlanId
}

export function UpgradeCreateAgentButton({ plan }: Props) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        showUsageUpsellToast({
          reason: "feature-locked",
          plan,
          onUpgrade: () => router.push("/dashboard/billing"),
        })
      }}
      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-border/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent sm:w-auto"
    >
      <Plus className="h-4 w-4" />
      Create agent
    </button>
  )
}
