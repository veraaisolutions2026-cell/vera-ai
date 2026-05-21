"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ShieldAlert, ScanSearch, FileText } from "lucide-react"
import { toast } from "sonner"
import { startChat } from "@/actions/chat-actions"
import type { AnswerPreference } from "@/lib/answer-preference"
import type { PlanId } from "@/lib/billing-plans"
import { DEFAULT_CHAT_MODEL_ID, normalizeModelId } from "@/lib/models"
import { showUsageUpsellToast } from "@/lib/usage-upsell-toast"
import { ChatAgentBar } from "./chat-agent-bar"
import { AgentWelcomeHero } from "./agent-welcome-hero"
import { ChatComposer, type AttachedFile } from "./chat-composer"
import { DEFAULT_PROMPTS } from "./default-prompts"
import type { Agent } from "@/types/database"

const SUBHEADINGS = [
  "Working late? Let's keep it efficient.",
  "What needs your attention today?",
  "What would you like to work through?",
  "Ready to review, analyse, or draft.",
]

type Props = {
  userId: string
  userName: string
  userAvatarUrl: string | null
  agents: Agent[]
  initialAnswerPreference: AnswerPreference | null
}

export function ChatNewPage({
  userId,
  userName,
  userAvatarUrl,
  agents,
  initialAnswerPreference,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modelFromQuery = searchParams.get("model")
  const selectedAgentIdFromQuery = searchParams.get("agent")
  const fromAgentCard = searchParams.get("fromAgentCard") === "1"
  const [input, setInput] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [model, setModel] = useState(
    normalizeModelId(modelFromQuery ?? DEFAULT_CHAT_MODEL_ID)
  )
  const [isStarting, setIsStarting] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [usagePlan, setUsagePlan] = useState<PlanId>("vera-coach")
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitInFlightRef = useRef(false)
  const routeHandoffRef = useRef(false)
  const launchToastShownRef = useRef(false)
  const promptIcons = {
    "shield-alert": ShieldAlert,
    "scan-search": ScanSearch,
    "file-text": FileText,
  }

  const firstName = userName.split(" ")[0] || "User"

  const showOutOfUsageToast = useCallback(() => {
    showUsageUpsellToast({
      reason: "usage-exhausted",
      plan: usagePlan,
      onUpgrade: () => router.push("/dashboard/billing"),
    })
  }, [router, usagePlan])

  const getUsageAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/usage/availability", {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        return {
          isAvailable: true,
          plan: usagePlan,
        }
      }

      const payload = (await response.json()) as {
        isAvailable?: boolean
        plan?: PlanId
      }

      const nextPlan = payload.plan ?? usagePlan
      setUsagePlan(nextPlan)

      return {
        isAvailable: payload.isAvailable !== false,
        plan: nextPlan,
      }
    } catch {
      // Do not hard-block users if availability check cannot be reached.
      return {
        isAvailable: true,
        plan: usagePlan,
      }
    }
  }, [usagePlan])

  useEffect(() => {
    if (!selectedAgentIdFromQuery) return

    const matchedAgent =
      agents.find((agent) => agent.id === selectedAgentIdFromQuery) ?? null
    if (!matchedAgent) return

    setSelectedAgent((current) =>
      current?.id === matchedAgent.id ? current : matchedAgent
    )

    if (fromAgentCard && !launchToastShownRef.current) {
      launchToastShownRef.current = true
      toast.success(`${matchedAgent.name} selected for this chat.`)

      const next = new URLSearchParams(searchParams.toString())
      next.delete("agent")
      next.delete("fromAgentCard")

      const nextQuery = next.toString()
      router.replace(
        nextQuery ? `/dashboard/chat?${nextQuery}` : "/dashboard/chat"
      )
    }
  }, [agents, fromAgentCard, router, searchParams, selectedAgentIdFromQuery])

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 5) return `Still up, ${firstName}?`
    if (hour < 12) return `Good morning, ${firstName}.`
    if (hour < 17) return `Good afternoon, ${firstName}.`
    return `Good evening, ${firstName}.`
  }

  function getSubheading() {
    const hour = new Date().getHours()
    if (hour < 5) return SUBHEADINGS[0]
    if (hour < 12) return SUBHEADINGS[1]
    if (hour < 17) return SUBHEADINGS[2]
    return SUBHEADINGS[3]
  }

  function typeIntoComposer(text: string) {
    if (typingRef.current) clearTimeout(typingRef.current)
    setInput("")

    let i = 0
    const speed = Math.max(12, Math.min(20, Math.round(6000 / text.length)))

    function tick() {
      i += 1
      setInput(text.slice(0, i))
      if (i < text.length) {
        typingRef.current = setTimeout(tick, speed)
      }
    }

    typingRef.current = setTimeout(tick, 60)
  }

  const handleStartChat = useCallback(
    async (overrideText?: string) => {
      const files = attachedFiles
      const text = (overrideText ?? input).trim()
      if (
        (text.length === 0 && files.length === 0) ||
        isStarting ||
        submitInFlightRef.current
      ) {
        return
      }

      // Set pending UI immediately so users get instant submit feedback.
      submitInFlightRef.current = true
      setIsStarting(true)

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        toast.error("Network unavailable. Check your connection and try again.")
        submitInFlightRef.current = false
        setIsStarting(false)
        return
      }

      const usage = await getUsageAvailability()
      if (!usage.isAvailable) {
        setUsagePlan(usage.plan)
        showOutOfUsageToast()
        submitInFlightRef.current = false
        setIsStarting(false)
        return
      }

      try {
        const result = await startChat(text, files, selectedAgent?.id, model)

        if (result.redirectTo) {
          routeHandoffRef.current = true
          router.push(result.redirectTo)
          return
        }

        if (result.error === "out_of_usage") {
          showOutOfUsageToast()
          return
        }

        if (!result.chatId) {
          toast.error("Could not start chat. Please try again.")
          return
        }

        const query = new URLSearchParams()
        if (initialAnswerPreference) {
          query.set("answerPreference", initialAnswerPreference)
        }

        routeHandoffRef.current = true
        router.push(
          query.toString()
            ? `/dashboard/chat/${result.chatId}?${query.toString()}`
            : `/dashboard/chat/${result.chatId}`
        )
      } catch {
        toast.error("Network failure. Please try again.")
      } finally {
        if (!routeHandoffRef.current) {
          submitInFlightRef.current = false
          setIsStarting(false)
        }
      }
    },
    [
      attachedFiles,
      getUsageAvailability,
      input,
      isStarting,
      model,
      initialAnswerPreference,
      router,
      selectedAgent,
      showOutOfUsageToast,
    ]
  )

  const triggerDefaultPrompt = useCallback(
    (prompt: (typeof DEFAULT_PROMPTS)[number]) => {
      if (prompt.behavior === "send-immediately") {
        const sendText = prompt.immediateText?.trim() || prompt.prefillText
        void handleStartChat(sendText)
        return
      }

      typeIntoComposer(prompt.prefillText)
    },
    [handleStartChat]
  )

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="new-chat-content"
        className="flex h-full flex-col"
        initial={{ opacity: 0, filter: "blur(10px)", y: 8 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative h-full">
          <motion.div
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center pb-8"
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-auto absolute inset-x-0 top-0 z-10">
              <div className="flex w-full px-4 pt-4 sm:px-6 lg:px-8">
                <ChatAgentBar
                  agents={agents}
                  selectedAgent={selectedAgent}
                  onAgentChange={setSelectedAgent}
                />
              </div>
            </div>

            <div className="flex w-full flex-col items-center">
              {selectedAgent ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.34,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-full"
                >
                  <AgentWelcomeHero
                    agent={selectedAgent}
                    userId={userId}
                    userName={userName}
                    userAvatarUrl={userAvatarUrl}
                  />
                </motion.div>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.34,
                      delay: 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="mb-1.5 px-4 text-center"
                  >
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {getGreeting()}
                    </h1>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.32,
                      delay: 0.18,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="mb-7 px-4 text-sm text-muted-foreground"
                  >
                    {getSubheading()}
                  </motion.p>
                </>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.38,
                  delay: 0.22,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="w-full"
              >
                <ChatComposer
                  input={input}
                  onInputChange={setInput}
                  onSubmit={() => void handleStartChat()}
                  isLoading={isStarting}
                  model={model}
                  onModelChange={setModel}
                  attachedFiles={attachedFiles}
                  onFileAttach={(file) =>
                    setAttachedFiles((prev) => [...prev, file])
                  }
                  onFileClear={(index) =>
                    setAttachedFiles((prev) =>
                      prev.filter((_, currentIndex) => currentIndex !== index)
                    )
                  }
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mt-4 w-full max-w-4xl px-4 sm:mt-3"
              >
                <div className="flex w-full flex-wrap justify-center gap-2.5">
                  {DEFAULT_PROMPTS.map((card) => {
                    const Icon = promptIcons[card.icon]
                    return (
                      <button
                        key={card.id}
                        onClick={() => triggerDefaultPrompt(card)}
                        disabled={isStarting}
                        className="group inline-flex items-center gap-2.5 rounded-full border border-border/50 bg-card/60 px-3.5 py-2 text-left text-sm font-medium transition-colors hover:border-border/80 hover:bg-card disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/6 text-muted-foreground/70 transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm leading-none font-medium whitespace-nowrap text-foreground">
                          {card.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
