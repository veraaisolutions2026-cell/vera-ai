// Re-export animate-ui tooltip so any imports from @/components/ui/tooltip
// automatically use the animated version.
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/animate-ui/components/radix/tooltip"

// TooltipProvider is bundled inside animate-ui's Tooltip — export a no-op shim
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
import React from "react"
