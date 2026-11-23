export default function WatchlistLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your watchlist">
      <h1 className="text-2xl font-bold">My Watchlist</h1>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-line-subtle bg-surface-panel/40" />
        ))}
      </div>
    </div>
  )
}
