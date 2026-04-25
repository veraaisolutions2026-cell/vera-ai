import { ArrowUpRight } from "lucide-react"
import { toast } from "sonner"
import type { PlanId } from "@/lib/billing-plans"

type ShowUsageUpsellToastOptions = {
  reason: "usage-exhausted" | "feature-locked"
  plan: PlanId
  onUpgrade?: () => void
  onContactSales?: () => void
}

export function showUsageUpsellToast({
  reason,
  plan,
  onUpgrade,
  onContactSales,
}: ShowUsageUpsellToastOptions) {
  const shouldContactSales =
    reason === "usage-exhausted" && plan === "vera-intelligence"

  const title =
    reason === "feature-locked"
      ? "Feature not available on this plan."
      : "Monthly limit reached."

  const description = shouldContactSales
    ? "You have reached your request capacity. Contact sales to increase your workspace limit."
    : reason === "feature-locked"
      ? "Upgrade your plan to unlock this feature."
      : "Upgrade your plan to continue chatting."

  const actionLabel = shouldContactSales ? "Contact sales" : "Upgrade"

  toast(title, {
    description,
    classNames: {
      toast:
        "rounded-2xl border border-border bg-background text-foreground shadow-xl",
      title: "text-sm font-semibold",
      description: "text-xs text-muted-foreground",
      actionButton:
        "!rounded-full !px-4 bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300",
      cancelButton:
        "rounded-full border border-border bg-background text-foreground hover:bg-muted",
    },
    action: {
      label: (
        <span className="inline-flex items-center gap-1.5">
          {actionLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      ),
      onClick: () => {
        if (!shouldContactSales) {
          window.dispatchEvent(new Event("vera:navigation-loader-start"))
          onUpgrade?.()
          return
        }

        onContactSales?.()
      },
    },
  })
}
