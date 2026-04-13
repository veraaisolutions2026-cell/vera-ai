import { getAllUsers } from "@/lib/db/admin"
import { UsersTable } from "./components/users-table"

export default async function AdminUsersPage() {
  const users = await getAllUsers()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} user{users.length !== 1 ? "s" : ""} registered
        </p>
      </div>

      <UsersTable users={users} />
    </div>
  )
}
