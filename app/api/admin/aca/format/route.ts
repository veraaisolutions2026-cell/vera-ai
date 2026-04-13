import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"

// Use the raw Anthropic client (not AI SDK) — this is a one-shot formatting call, not streaming
const client = new Anthropic()

const FORMAT_SYSTEM_PROMPT = `You are a professional document formatter. You receive raw text extracted from a Word document (.docx) using a text extractor. The text is an AI agent specification that uses a §-numbered section system (e.g. §1, §1.1, §6.5).

Your task: Reformat the raw extracted text into clean, well-structured markdown. Rules:
- Preserve every §-numbered section header exactly as written — do not change numbering
- Turn section headers into ## (top-level §N) or ### (subsections §N.M) format
- Fix spacing, line break artifacts, and formatting issues from the Word extraction
- Keep 100% of the content intact — do not summarise, add, or remove anything
- Format lists with proper markdown bullets (- ) or numbered items
- Wrap any code-like content in code blocks
- Ensure proper paragraph spacing (blank line between paragraphs)

Output ONLY the formatted markdown. No introduction, no commentary, no preamble.`

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin")
    return new Response("Forbidden", { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return Response.json({ error: "No file provided." }, { status: 400 })
  }

  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (!allowed.includes(file.type)) {
    return Response.json(
      { error: "Only PDF and DOCX files are supported." },
      { status: 400 }
    )
  }

  // Extract raw text
  let rawText: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (
        buf: Buffer
      ) => Promise<{ text: string }>
      const result = await pdfParse(buffer)
      rawText = result.text
    }
  } catch {
    return Response.json(
      { error: "Failed to extract text from file." },
      { status: 500 }
    )
  }

  if (!rawText.trim()) {
    return Response.json(
      { error: "Could not extract any text from the file." },
      { status: 400 }
    )
  }

  // Format with Claude
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: FORMAT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please format the following extracted document text:\n\n${rawText}`,
        },
      ],
    })

    const formatted = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    return Response.json({ formatted, raw_length: rawText.length })
  } catch {
    return Response.json(
      { error: "Failed to format document with AI." },
      { status: 500 }
    )
  }
}
