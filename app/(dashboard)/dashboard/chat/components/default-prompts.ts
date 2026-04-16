export type DefaultPromptBehavior = "prefill-for-review" | "send-immediately"

export type DefaultPromptDefinition = {
  id: "audit-risk" | "workpaper-review" | "ifrs-disclosure"
  icon: "shield-alert" | "scan-search" | "file-text"
  title: string
  description: string
  prefillText: string
  /**
   * Used only when behavior is send-immediately. This keeps machine-triggered
   * prompts concise and bounded so the first response stays on-scope.
   */
  immediateText?: string
  behavior: DefaultPromptBehavior
  expectedOutput: string
}

export const DEFAULT_PROMPTS: DefaultPromptDefinition[] = [
  {
    id: "audit-risk",
    icon: "shield-alert",
    title: "Analyse audit risk",
    description:
      "Surface key risks and material misstatements across an engagement",
    prefillText:
      "Provide a first-pass audit risk summary in markdown with exactly this structure: 'Assumptions' (2-3 bullets), then 'Risk 1', 'Risk 2', 'Risk 3'. Under each risk, provide exactly 4 bullets in this order: Risk statement, likely material misstatement, assertion(s), practical audit procedure. Keep each bullet to one sentence and use plain audit language. If engagement details are missing, do not refuse and do not ask for context first; proceed using a typical mid-sized entity scenario. End with 'What to confirm with the client' containing up to 4 concise bullets. Do not include introductory or closing paragraphs.",
    behavior: "prefill-for-review",
    expectedOutput:
      "Structured markdown output with assumptions, exactly 3 risks (4 bullets each), and a short client-confirmation checklist.",
  },
  {
    id: "workpaper-review",
    icon: "scan-search",
    title: "Review a workpaper",
    description: "Check completeness, accuracy, and sign-off readiness",
    prefillText:
      "Review this workpaper for sign-off readiness. Return: (1) missing cross-references, (2) weak/insufficient evidence, and (3) unresolved exceptions. Keep to short bullet points.",
    behavior: "prefill-for-review",
    expectedOutput:
      "Short, actionable bullets grouped by cross-references, evidence quality, and unresolved exceptions.",
  },
  {
    id: "ifrs-disclosure",
    icon: "file-text",
    title: "Draft disclosure notes",
    description: "Generate IFRS-compliant financial statement language",
    prefillText:
      "Draft IFRS 15 revenue recognition disclosure notes for a mid-sized services company. Keep to a practical template with: performance obligations, key judgements, and measurement basis.",
    behavior: "prefill-for-review",
    expectedOutput:
      "A practical IFRS-focused draft template with clear section headings and concise language.",
  },
]
