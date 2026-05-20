"use client"

import { useState, useTransition } from "react"
import { MessageSquareText } from "lucide-react"
import { toast } from "sonner"
import { updateAnswerPreference } from "@/actions/settings-actions"
import { AnswerPreferenceDropdown } from "@/components/answer-preference-dropdown"
import type { AnswerPreference } from "@/lib/answer-preference"

type Props = {
  initialAnswerPreference: AnswerPreference | null
}

export function AnswerPreferenceSettings({ initialAnswerPreference }: Props) {
  const [answerPreference, setAnswerPreference] =
    useState<AnswerPreference | null>(initialAnswerPreference)
  const [isPending, startTransition] = useTransition()

  function handleChange(nextPreference: AnswerPreference) {
    if (nextPreference === answerPreference) return

    startTransition(async () => {
      const result = await updateAnswerPreference(nextPreference)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setAnswerPreference(result.answerPreference)
      toast.success("Preference saved")
    })
  }

  return (
    <section className="rounded-xl bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-1 dark:ring-white/6">
      <div className="border-b border-border/50 px-6 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/6 text-foreground/70">
            <MessageSquareText className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm leading-none font-semibold">
              Answer preference
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Choose the default response length Vera should use in chat.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-sm font-medium">Default answer style</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              If this is not set yet, Vera will ask once on your first prompt
              and remember it for future chats. You can change it here or inside
              any chat at any time.
            </p>
          </div>

          <AnswerPreferenceDropdown
            value={answerPreference}
            onChange={handleChange}
            disabled={isPending}
            dataTestId="settings-answer-preference"
          />
        </div>
      </div>
    </section>
  )
}
