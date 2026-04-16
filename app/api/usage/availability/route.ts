import { createClient } from "@/lib/supabase/server"
import { getUsageAvailability } from "@/lib/db/usage-limits"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const usage = await getUsageAvailability(user.id)

  return Response.json(usage, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
