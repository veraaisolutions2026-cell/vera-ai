import Image from "next/image"
import { AgentIcon } from "@/components/agent-icon-picker"
import { VeraLogo } from "@/components/ui/vera-logo"
import type { Agent } from "@/types/database"

type Props = {
  agent: Agent
  userId: string
  userName: string
  userAvatarUrl: string | null
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (!parts.length) return "U"
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

export function AgentWelcomeHero({
  agent,
  userId,
  userName,
  userAvatarUrl,
}: Props) {
  const isOwnedByCurrentUser = agent.user_id === userId && !agent.is_builtin
  const ownerLabel = isOwnedByCurrentUser ? "By You" : "By Vera Solutions"
  const description =
    agent.description?.trim() ||
    "This agent is ready to help you work through your audit workflow."

  return (
    <div className="mx-auto mb-5 w-full max-w-2xl px-4 text-center sm:mb-6">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/70">
        <AgentIcon name={agent.icon} className="h-5 w-5" />
      </div>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {agent.name}
      </h1>

      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
        <span>{ownerLabel}</span>
        {isOwnedByCurrentUser ? (
          userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt={userName}
              width={18}
              height={18}
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground">
              {getInitials(userName)}
            </span>
          )
        ) : (
          <VeraLogo
            width={16}
            height={16}
            variant="short"
            priority={false}
            className="opacity-70 grayscale"
          />
        )}
      </div>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
        {description}
      </p>
    </div>
  )
}
