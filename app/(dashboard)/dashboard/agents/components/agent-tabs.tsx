"use client"

import { useMemo } from "react"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
} from "@/components/animate-ui/components/animate/tabs"
import { AgentCard } from "./agent-card"
import type { Agent } from "@/types/database"

type Props = {
  builtinAgents: Agent[]
  userAgents: Agent[]
  allowCustomAgentCrud?: boolean
}

export function AgentTabs({
  builtinAgents,
  userAgents,
  allowCustomAgentCrud = true,
}: Props) {
  const allAgents = useMemo(
    () => [...userAgents, ...builtinAgents],
    [userAgents, builtinAgents]
  )

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({allAgents.length})</TabsTrigger>
        {allowCustomAgentCrud ? (
          <TabsTrigger value="mine">Mine ({userAgents.length})</TabsTrigger>
        ) : null}
        <TabsTrigger value="builtin">
          Built-in ({builtinAgents.length})
        </TabsTrigger>
      </TabsList>

      <TabsContents>
        {/* All */}
        <TabsContent value="all">
          {allAgents.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No agents available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
              {allAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  editable={!agent.is_builtin}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Mine */}
        {allowCustomAgentCrud ? (
          <TabsContent value="mine">
            {userAgents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t created any agents yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
                {userAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} editable />
                ))}
              </div>
            )}
          </TabsContent>
        ) : null}

        {/* Built-in */}
        <TabsContent value="builtin">
          {builtinAgents.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No built-in agents configured yet. Ask your admin to set them up.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-px sm:grid-cols-2 lg:grid-cols-3">
              {builtinAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} editable={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </TabsContents>
    </Tabs>
  )
}
