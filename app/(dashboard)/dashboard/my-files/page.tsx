import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { listKnowledgeBaseFiles } from "@/lib/db/knowledge-base"
import { getUserLayerAccess } from "@/lib/db/layer-access"

export const metadata = {
  title: "My Files — Vera AI",
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default async function MyFilesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const layerAccess = await getUserLayerAccess(user.id)

  if (!layerAccess.allowKnowledgeBaseManagement) {
    redirect("/dashboard/chat")
  }

  const files = await listKnowledgeBaseFiles(user.id, { scope: "user" })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Files</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal PDF library. Only files you own are visible here.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border/60 bg-background p-5">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files yet. Upload support in My Files is planned in the next
            phase.
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="rounded-md border border-border/50 px-3 py-2"
              >
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size_bytes)} | {file.mime_type} |{" "}
                  {new Date(file.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
