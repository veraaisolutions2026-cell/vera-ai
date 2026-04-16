import { ArrowUpRight } from "lucide-react"
import { toast } from "sonner"

type ShowUsageUpsellToastOptions = {
  onUpgrade: () => void
}

export function showUsageUpsellToast({
  onUpgrade,
}: ShowUsageUpsellToastOptions) {
  toast("Monthly limit reached.", {
    description: "Upgrade your plan to continue chatting.",
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
          Upgrade
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      ),
      onClick: () => {
        window.dispatchEvent(new Event("vera:navigation-loader-start"))
        onUpgrade()
      },
    },
  })
}
