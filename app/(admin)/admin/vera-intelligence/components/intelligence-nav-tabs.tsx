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
  knowledgeBaseContent: ReactNode
  agentLinkingContent: ReactNode
  knowledgeBaseAction?: ReactNode
  agentLinkingAction?: ReactNode
}

export function IntelligenceNavTabs({
  knowledgeBaseContent,
  agentLinkingContent,
  knowledgeBaseAction,
  agentLinkingAction,
}: Props) {
  return (
    <Tabs defaultValue="knowledge-base" className="gap-4">
      <TabsList>
        <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
        <TabsTrigger value="agent-linking">Agent Linking</TabsTrigger>
      </TabsList>

      <TabsContents>
        <TabsContent value="knowledge-base">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Knowledge Base
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage shared intelligence PDFs and govern the canonical file
                  library for premium workflows.
                </p>
              </div>
              {knowledgeBaseAction}
            </div>

            <div className="mt-4">{knowledgeBaseContent}</div>
          </div>
        </TabsContent>

        <TabsContent value="agent-linking">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Agent Linking
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review and manage many-to-many links between intelligence
                  files and agents.
                </p>
              </div>
              {agentLinkingAction}
            </div>

            <div className="mt-4">{agentLinkingContent}</div>
          </div>
        </TabsContent>
      </TabsContents>
    </Tabs>
  )
}
