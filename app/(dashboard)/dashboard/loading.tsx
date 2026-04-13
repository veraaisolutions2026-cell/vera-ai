export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="mb-6 h-7 w-44 animate-pulse rounded-md bg-muted" />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl border border-border/40 bg-muted/50" />
        <div className="h-24 animate-pulse rounded-xl border border-border/40 bg-muted/50" />
        <div className="h-24 animate-pulse rounded-xl border border-border/40 bg-muted/50" />
      </div>

      <div className="h-28 animate-pulse rounded-2xl border border-border/40 bg-muted/40" />

      <div className="mt-6 space-y-3">
        <div className="h-4 w-52 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-xl border border-border/40 bg-muted/40" />
        <div className="h-16 animate-pulse rounded-xl border border-border/40 bg-muted/40" />
      </div>
    </div>
  )
}
