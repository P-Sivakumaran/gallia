export default function PlayerLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading player">
      <div className="flex items-start gap-6">
        <div className="h-20 w-20 animate-pulse rounded-2xl border border-line bg-surface-raised" />
        <div className="space-y-3 pt-2">
          <div className="h-7 w-56 animate-pulse rounded bg-surface-raised" />
          <div className="h-4 w-40 animate-pulse rounded bg-surface-raised/60" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-line-subtle bg-surface-panel/40" />
        ))}
      </div>
    </div>
  )
}
