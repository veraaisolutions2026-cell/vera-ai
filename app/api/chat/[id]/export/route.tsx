import { createClient } from "@/lib/supabase/server"
import { getMessages } from "@/lib/db/messages"
import { getChat } from "@/lib/db/chats"
import { format } from "date-fns"

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

  const title = chat.title ?? "Conversation"
  const date = format(new Date(chat.created_at), "yyyy-MM-dd")
  const safeTitle = title.replace(/[^a-z0-9\s-]/gi, "").slice(0, 60)

  if (fmt === "md") {
    const lines: string[] = [
      `# ${title}`,
      ``,
      `**Exported:** ${format(new Date(), "PPP")}`,
      ``,
      `---`,
      ``,
    ]
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
      `Exported: ${format(new Date(), "PPP")}`,
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
    <Document title={title} author="Vera AI">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          Exported {format(new Date(), "PPP")} · Vera AI
        </Text>
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
