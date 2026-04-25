"use client"

import type { ReactNode } from "react"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@/components/animate-ui/components/animate/tabs"

type Props = {
  entitlementsContent: ReactNode
  actionContent?: ReactNode
}

export function CoachNavTabs({ entitlementsContent, actionContent }: Props) {
  return (
    <Tabs defaultValue="entitlements" className="gap-4">
      <TabsList>
        <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
      </TabsList>

      <TabsContents>
        <TabsContent value="entitlements">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Coach Entitlements
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure what Vera Coach users can access across chat,
                  agents, and file-related capabilities.
                </p>
              </div>
              {actionContent}
            </div>

            <div className="mt-4">{entitlementsContent}</div>
          </div>
        </TabsContent>
      </TabsContents>
    </Tabs>
  )
}
