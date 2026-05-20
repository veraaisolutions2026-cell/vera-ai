"use client"

import { motion, useReducedMotion } from "motion/react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/animate-ui/components/radix/accordion"

const FAQ_ITEMS = [
  {
    q: "What is Vera AI and how does it work?",
    a: "Vera AI is an intelligent auditing workspace powered by Claude, trained to assist audit professionals with precision and reliability. You interact with purpose-built agents that understand audit workflows, compliance requirements, and financial documentation. Each agent can be customised with a system prompt, knowledge base, and output format to match your exact audit process.",
  },
  {
    q: "What can I use Vera AI for?",
    a: "Vera AI is built for the full audit lifecycle. Use it to review financial statements and source documents, draft audit observations and management letters, cross-reference evidence against criteria, summarise lengthy reports, and accelerate repetitive documentation tasks. If it is part of your audit workflow, Vera has an agent for it.",
  },
  {
    q: "How much does it cost to use Vera AI?",
    a: "Vera AI offers two plans. Vera Coach at $49 per month (or $39 billed annually) provides a ready-to-use chat workspace with built-in agents and around 500 requests per month. Vera Intelligence at $149 per month (or $119 billed annually) unlocks unlimited custom agent creation, knowledge-base tooling, agent-to-file linking, and around 1,500 requests per month with priority support.",
  },
  {
    q: "What makes Vera AI different from a general-purpose AI assistant?",
    a: "General AI assistants are built for breadth. Vera AI is built for depth in auditing. Every feature, from agent prompts to knowledge-base linking, is designed around audit methodology. You get structured outputs formatted for audit files, context that persists across a session, and agents that behave consistently under your defined rules rather than producing unpredictable responses.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit and at rest. Vera AI is built on Supabase with row-level security enforced on every table, meaning your organisation's data is strictly isolated. Files you upload within a session are used only to generate responses and are not stored beyond your session unless you explicitly save them to a knowledge base.",
  },
  {
    q: "Can I create and share agents with my team?",
    a: "On the Vera Intelligence plan, you can create unlimited custom agents. Agents you build are available to your workspace. Team sharing and collaboration features are on the roadmap and will roll out to existing subscribers first.",
  },
] as const

const EASE = [0.16, 1, 0.3, 1] as const

export function Faq() {
  const reduce = useReducedMotion()
  const y = reduce ? 0 : 32
  const dur = reduce ? 0 : 0.65

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="px-6 pt-4 pb-14 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: dur, ease: EASE }}
          className="mb-12 flex flex-col items-center text-center"
        >
          <h2
            id="faq-heading"
            className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Frequently asked questions
          </h2>
          <p className="max-w-md text-base text-muted-foreground">
            Everything you need to know before you get started.
          </p>
        </motion.div>

        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{
                duration: reduce ? 0 : 0.55,
                ease: EASE,
                delay: reduce ? 0 : i * 0.07,
              }}
            >
              <AccordionItem value={`item-${i}`}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline sm:text-base">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pb-1 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
