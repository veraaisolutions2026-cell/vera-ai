export type AnswerPreference = "short" | "long"

export const ANSWER_PREFERENCE_OPTIONS = [
  {
    value: "short",
    label: "Short answer",
    shortLabel: "Short",
    description: "Quick, direct, and focused on the main point.",
  },
  {
    value: "long",
    label: "Long answer",
    shortLabel: "Long",
    description: "More context, fuller reasoning, and practical detail.",
  },
] as const satisfies ReadonlyArray<{
  value: AnswerPreference
  label: string
  shortLabel: string
  description: string
}>

export function isAnswerPreference(
  value: string | null | undefined
): value is AnswerPreference {
  return value === "short" || value === "long"
}

export function getAnswerPreferenceLabel(
  value: AnswerPreference | null | undefined
): string {
  return (
    ANSWER_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label ??
    "Not set"
  )
}

export function getAnswerPreferenceShortLabel(
  value: AnswerPreference | null | undefined
): string {
  return (
    ANSWER_PREFERENCE_OPTIONS.find((option) => option.value === value)
      ?.shortLabel ?? "Reply style"
  )
}
