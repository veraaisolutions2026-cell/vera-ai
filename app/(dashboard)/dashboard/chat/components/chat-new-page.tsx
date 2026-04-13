"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { ShieldAlert, ScanSearch, FileText } from "lucide-react"
import { toast } from "sonner"
import { startChat } from "@/actions/chat-actions"
import { ChatComposer, type AttachedFile } from "./chat-composer"
import type { Agent } from "@/types/database"

const PROMPT_CARDS = [
  {
    icon: ShieldAlert,
    title: "Analyse audit risk",
    description:
      "Surface key risks and material misstatements across an engagement",
    prompt:
      "Summarise the key audit risks and potential material misstatements I should address in this engagement. Include relevant assertions and suggested audit procedures.",
  },
  {
    icon: ScanSearch,
    title: "Review a workpaper",
    description: "Check completeness, accuracy, and sign-off readiness",
    prompt:
      "Review my workpaper for completeness, accuracy, and any gaps that could affect the audit conclusion. Flag missing cross-references, weak evidence, or unresolved exceptions.",
  },
  {
    icon: FileText,
    title: "Draft disclosure notes",
    description: "Generate IFRS-compliant financial statement language",
    prompt:
      "Draft IFRS-compliant disclosure notes for revenue recognition under IFRS 15. Include judgements made, performance obligations identified, and the basis of measurement.",
  },
]

const SUBHEADINGS = [
  "Working late? Let's keep it efficient.",
  "What needs your attention today?",
  "What would you like to work through?",
  "Ready to review, analyse, or draft.",
]

type Props = {
  userName: string
  agents: Agent[]
}

export function ChatNewPage({ userName, agents }: Props) {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [model, setModel] = useState("claude-sonnet-4-6")
  const [isStarting, setIsStarting] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submitInFlightRef = useRef(false)

  const firstName = userName.split(" ")[0] || "User"

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

  const handleStartChat = useCallback(async () => {
    const text = input.trim()
    if (
      (text.length === 0 && attachedFiles.length === 0) ||
      isStarting ||
      submitInFlightRef.current
    ) {
      return
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Network unavailable. Check your connection and try again.")
      return
    }

    submitInFlightRef.current = true
    setIsStarting(true)

    try {
      const files = attachedFiles
      setAttachedFiles([])
      setInput("")

      const result = await startChat(text, files, selectedAgent?.id, model)

      if (result.redirectTo) {
        router.push(result.redirectTo)
        return
      }

      if (!result.chatId) {
        toast.error("Could not start chat. Please try again.")
        return
      }

      router.push(`/dashboard/chat/${result.chatId}`)
    } catch {
      toast.error("Network failure. Please try again.")
    } finally {
      submitInFlightRef.current = false
      setIsStarting(false)
    }
  }, [attachedFiles, input, isStarting, model, router, selectedAgent?.id])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="new-chat-content"
        className="flex h-full flex-col"
        initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      >
        <div className="relative h-full">
          <motion.div
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center pb-8"
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex w-full flex-col items-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.06, ease: "easeOut" }}
                className="mb-1.5 px-4 text-center"
              >
                <h1 className="text-2xl font-semibold tracking-tight">
                  {getGreeting()}
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.12, ease: "easeOut" }}
                className="mb-7 px-4 text-sm text-muted-foreground"
              >
                {getSubheading()}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.18 }}
                className="w-full"
              >
                <ChatComposer
                  input={input}
                  onInputChange={setInput}
                  onSubmit={() => void handleStartChat()}
                  isLoading={isStarting}
                  agents={agents}
                  selectedAgent={selectedAgent}
                  onAgentChange={setSelectedAgent}
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
                transition={{ duration: 0.28, delay: 0.24 }}
                className="mt-4 w-full max-w-3xl px-4 sm:mt-3"
              >
                <p className="mb-2.5 text-[11px] font-medium tracking-wide text-muted-foreground/50 uppercase">
                  Get started with an example
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PROMPT_CARDS.map((card) => {
                    const Icon = card.icon
                    return (
                      <button
                        key={card.title}
                        onClick={() => typeIntoComposer(card.prompt)}
                        disabled={isStarting}
                        className="group flex flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left transition-all hover:border-border/80 hover:bg-card disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/6 text-muted-foreground/70 transition-colors group-hover:bg-foreground/10 group-hover:text-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-sm leading-snug font-medium">
                            {card.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {card.description}
                          </p>
                        </div>
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