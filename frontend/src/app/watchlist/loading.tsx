import DeskPage from '@/components/desk/DeskPage'

export default function WatchlistLoading() {
  return (
    <DeskPage eyebrow="ACCOUNT" title="Watchlist">
      <section className="g-panel" aria-busy="true" aria-label="Loading your watchlist">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="g-ledger-row" style={{ opacity: 0.5 }}><span className="g-note">Loading…</span></div>
        ))}
      </section>
    </DeskPage>
  )
}
