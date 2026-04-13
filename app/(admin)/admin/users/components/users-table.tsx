"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { UserRow } from "@/lib/db/admin"
import type { Profile } from "@/types/database"

const ROLES: Profile["role"][] = ["admin", "user", "viewer"]

const roleColors: Record<Profile["role"], string> = {
  admin: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  user: "bg-foreground/8 text-muted-foreground",
  viewer: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const router = useRouter()
  const [updating, setUpdating] = useState<string | null>(null)

  async function handleRoleChange(userId: string, role: Profile["role"]) {
    setUpdating(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    setUpdating(null)
    router.refresh()
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
        <p className="text-sm text-muted-foreground">No users yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-foreground/[0.02] text-left">
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
              Email
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
              Role
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
              Joined
            </th>
            <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
              Change role
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3 font-medium">{user.full_name ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {user.email ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    roleColors[user.role]
                  )}
                >
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <select
                  value={user.role}
                  disabled={updating === user.id}
                  onChange={(e) =>
                    handleRoleChange(user.id, e.target.value as Profile["role"])
                  }
                  className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs transition-colors outline-none focus:border-foreground/40 disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
