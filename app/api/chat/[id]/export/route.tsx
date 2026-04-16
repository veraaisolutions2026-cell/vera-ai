import { createClient } from "@/lib/supabase/server"
import { getMessages } from "@/lib/db/messages"
import { getChat } from "@/lib/db/chats"
import { getAgent } from "@/lib/db/agents"
import { format } from "date-fns"

type ExportHeaderContext = {
  title: string
  agentName: string
  model: string
  conversationStart: Date
  conversationEnd: Date
  userName: string
  exportDate: Date
}

type HeaderField = {
  label: string
  value: string
}

function sanitizeFileName(title: string): string {
  return (
    title
      .trim()
      .replace(/[^a-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || "conversation"
  )
}

function buildHeaderFields(ctx: ExportHeaderContext): HeaderField[] {
  return [
    { label: "Agent Name", value: ctx.agentName },
    {
      label: "Conversation Start",
      value: format(ctx.conversationStart, "PPP p"),
    },
    {
      label: "Conversation End",
      value: format(ctx.conversationEnd, "PPP p"),
    },
    { label: "Model / Version", value: ctx.model },
    { label: "User Name", value: ctx.userName },
    { label: "Export Date", value: format(ctx.exportDate, "PPP p") },
  ]
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id: chatId } = await params
  const { searchParams } = new URL(req.url)
  const fmt = searchParams.get("format") ?? "md"

  if (!["pdf", "md", "txt"].includes(fmt)) {
    return new Response("Invalid format", { status: 400 })
  }

  // Ownership check
  const chat = await getChat(chatId)
  if (!chat || chat.user_id !== user.id) {
    return new Response("Not found", { status: 404 })
  }

  const messages = await getMessages(chatId, user.id)
  const profileResult = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  const agent = chat.agent_id ? await getAgent(chat.agent_id) : null

  const title = chat.title ?? "Conversation"
  const date = format(new Date(chat.created_at), "yyyy-MM-dd")
  const safeTitle = sanitizeFileName(title).slice(0, 60)
  const exportDate = new Date()

  const sortedDates = messages
    .map((message) => new Date(message.created_at))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  const conversationStart =
    sortedDates[0] ?? new Date(chat.created_at ?? exportDate.toISOString())
  const conversationEnd =
    sortedDates[sortedDates.length - 1] ??
    new Date(chat.updated_at ?? chat.created_at ?? exportDate.toISOString())

  const userName =
    profileResult.data?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User"

  const headerContext: ExportHeaderContext = {
    title,
    agentName: agent?.name ?? "No agent selected",
    model: chat.model,
    conversationStart,
    conversationEnd,
    userName,
    exportDate,
  }
  const headerFields = buildHeaderFields(headerContext)

  const hiddenMetadata = {
    schema: "vera.chat.export.v1",
    chatId,
    userId: user.id,
    title,
    agentName: headerContext.agentName,
    model: headerContext.model,
    conversationStart: headerContext.conversationStart.toISOString(),
    conversationEnd: headerContext.conversationEnd.toISOString(),
    userName: headerContext.userName,
    exportDate: headerContext.exportDate.toISOString(),
  }
  const hiddenMetadataJson = JSON.stringify(hiddenMetadata)
  const hiddenMetadataPdfFragment =
    Buffer.from(hiddenMetadataJson).toString("base64url")

  if (fmt === "md") {
    const lines: string[] = [`# ${title}`, ``, `## Conversation Context`, ``]

    headerFields.forEach((field) => {
      lines.push(`- ${field.label}: ${field.value}`)
    })

    lines.push(
      "",
      `<!-- vera-export-metadata: ${hiddenMetadataJson} -->`,
      "",
      `---`,
      ""
    )

    for (const msg of messages) {
      const label = msg.role === "user" ? "**You**" : "**Vera AI**"
      lines.push(`${label}`, ``, msg.content, ``, `---`, ``)
    }
    const md = lines.join("\n")
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${date}-${safeTitle}.md"`,
      },
    })
  }

  if (fmt === "txt") {
    const lines: string[] = [
      title,
      "",
      "Conversation Context",
      ...headerFields.map((field) => `${field.label}: ${field.value}`),
      ``,
      `[vera-export-metadata] ${hiddenMetadataJson}`,
      ``,
      `---`,
      ``,
    ]
    for (const msg of messages) {
      const label = msg.role === "user" ? "YOU" : "VERA AI"
      lines.push(`[${label}]`, msg.content, ``, `---`, ``)
    }
    const txt = lines.join("\n")
    return new Response(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${date}-${safeTitle}.txt"`,
      },
    })
  }

  // PDF — generate on the server using @react-pdf/renderer
  // Lazy import to avoid SSR bundle bloat
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } =
    await import("@react-pdf/renderer")

  const styles = StyleSheet.create({
    page: {
      padding: 48,
      fontFamily: "Helvetica",
      fontSize: 11,
      lineHeight: 1.5,
    },
    title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
    meta: { fontSize: 9, color: "#888888", marginBottom: 24 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      marginBottom: 8,
      color: "#111827",
    },
    headerBlock: {
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderRadius: 6,
      padding: 10,
      marginBottom: 12,
      backgroundColor: "#f9fafb",
    },
    headerRow: {
      marginBottom: 4,
    },
    headerLabel: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#4b5563",
      textTransform: "uppercase",
      marginBottom: 1,
    },
    headerValue: {
      fontSize: 10,
      color: "#111827",
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: "#e5e7eb",
      marginVertical: 12,
    },
    label: {
      fontSize: 9,
      fontFamily: "Helvetica-Bold",
      color: "#6b7280",
      textTransform: "uppercase",
      marginBottom: 4,
    },
    content: { fontSize: 11, color: "#111827", lineHeight: 1.6 },
  })

  const doc = (
    <Document
      title={title}
      author={headerContext.userName}
      subject={`Agent: ${headerContext.agentName} | Model: ${headerContext.model} | Start: ${headerContext.conversationStart.toISOString()} | End: ${headerContext.conversationEnd.toISOString()}`}
      keywords={`vera-ai,chat-export,agent:${headerContext.agentName},model:${headerContext.model},chat:${chatId},schema:${hiddenMetadata.schema},meta:${hiddenMetadataPdfFragment}`}
      creator="Vera AI"
      producer="Vera AI Export Service"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          Exported {format(exportDate, "PPP p")} · Vera AI
        </Text>
        <Text style={styles.sectionTitle}>Conversation Context</Text>
        <View style={styles.headerBlock}>
          {headerFields.map((field) => (
            <View key={field.label} style={styles.headerRow}>
              <Text style={styles.headerLabel}>{field.label}</Text>
              <Text style={styles.headerValue}>{field.value}</Text>
            </View>
          ))}
        </View>
        <View style={styles.divider} />
        {messages.map((msg) => (
          <View key={msg.id} style={{ marginBottom: 16 }}>
            <Text style={styles.label}>
              {msg.role === "user" ? "You" : "Vera AI"}
            </Text>
            <Text style={styles.content}>{msg.content}</Text>
            <View style={styles.divider} />
          </View>
        ))}
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(doc)

  return new Response(
    new Blob([new Uint8Array(buffer)], { type: "application/pdf" }),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${date}-${safeTitle}.pdf"`,
      },
    }
  )
}
