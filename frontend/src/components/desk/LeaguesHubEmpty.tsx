import Link from 'next/link'

/** Empty state for /leagues when no competitions are synced. */
export default function LeaguesHubEmpty() {
  return (
    <div className="g-empty" style={{ padding: 24 }} data-testid="leagues-hub-empty">
      <p>No competitions synced yet. Run the football-data sync when TheStatsAPI is on a paid plan.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/rumours" className="g-green-link" data-testid="leagues-hub-empty-rumours-cta">
          Browse rumours →
        </Link>
      </p>
    </div>
  )
}
