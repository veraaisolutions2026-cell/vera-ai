"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import type { UserRow } from "@/lib/db/admin"
import type { Profile } from "@/types/database"

const roleColors: Record<Profile["role"], string> = {
  admin: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  user: "bg-foreground/8 text-muted-foreground",
  viewer: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

export function UsersTable({ users }: { users: UserRow[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<"all" | Profile["role"]>("all")
  const [rowsPerPage, setRowsPerPage] = useState<10 | 20 | 50>(10)
  const [page, setPage] = useState(1)

  const filteredUsers = useMemo(() => {
    if (roleFilter === "all") return users
    return users.filter((user) => user.role === roleFilter)
  }, [roleFilter, users])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * rowsPerPage
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage)

  async function handleDeleteUser(userId: string) {
    if (!confirm("Remove this user account permanently?")) return
    setDeleting(userId)
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
    setDeleting(null)

    if (res.ok) {
      router.refresh()
      return
    }

    const data = (await res.json().catch(() => ({}))) as { error?: string }
    alert(data.error ?? "Failed to remove user")
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 py-20">
        <p className="text-sm text-muted-foreground">No users yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Showing {pagedUsers.length} of {filteredUsers.length} users
        </p>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                Role: {roleFilter === "all" ? "All" : roleFilter}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Role filter</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value as "all" | Profile["role"])
                  setPage(1)
                }}
              >
                <DropdownMenuRadioItem value="all">
                  All roles
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="admin">
                  Admin
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="user">User</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="viewer">
                  Viewer
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-full border border-border/60 px-3 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                Rows: {rowsPerPage}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value) as 10 | 20 | 50)
                  setPage(1)
                }}
              >
                <DropdownMenuRadioItem value="10">10</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="20">20</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="50">50</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {pagedUsers.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-border/60 bg-background p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {user.full_name ?? "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {user.email ?? "—"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                      roleColors[user.role]
                    )}
                  >
                    {user.role}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                    Select
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>User actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => handleDeleteUser(user.id)}
                    disabled={deleting === user.id}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting === user.id ? "Removing..." : "Remove user"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border/60 md:block">
        <table className="w-full min-w-190 text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-foreground/2 text-left">
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
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {pagedUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium">
                  {user.full_name ?? "—"}
                </td>
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
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex h-7 items-center gap-1 rounded-full border border-border/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                        Select
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>User actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => handleDeleteUser(user.id)}
                        disabled={deleting === user.id}
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting === user.id ? "Removing..." : "Remove user"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNumber = idx + 1
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={pageNumber === currentPage}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
