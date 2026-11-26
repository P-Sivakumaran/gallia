'use client'

import { useState } from 'react'
import TransferGraph from './TransferGraph'
import ClubMap from './ClubMap'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'HOT', label: 'Hot' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
] as const

type View = 'network' | 'map'

/**
 * Shared chrome for the network page: Map/Network toggle plus filters that the
 * map view reuses. The graph keeps its own status/feed controls inside its panel.
 */
export default function NetworkExplorer() {
  const [view, setView] = useState<View>('network')
  const [includeFeed, setIncludeFeed] = useState(false)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all')

  return (
    <div className="g-stack">
      <div className="g-network-chrome">
        <nav className="g-feed-tabs" aria-label="Network or map">
          <button type="button" className={view === 'network' ? 'active' : ''} aria-pressed={view === 'network'} onClick={() => setView('network')}>Network</button>
          <button type="button" className={view === 'map' ? 'active' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
        </nav>
        {view === 'map' && (
          <>
            <nav className="g-feed-tabs" aria-label="Filter rumours by status">
              {FILTERS.map((f) => (
                <button key={f.value} type="button" className={filter === f.value ? 'active' : ''} aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>{f.label}</button>
              ))}
            </nav>
            <nav className="g-feed-tabs" aria-label="Which deals to include">
              <button type="button" className={includeFeed ? '' : 'active'} aria-pressed={!includeFeed} onClick={() => setIncludeFeed(false)}>News rumours</button>
              <button type="button" className={includeFeed ? 'active' : ''} aria-pressed={includeFeed} onClick={() => setIncludeFeed(true)}>+ Feed transfers</button>
            </nav>
          </>
        )}
      </div>
      {view === 'network' ? <TransferGraph /> : (
        <section className="g-panel">
          <ClubMap includeFeed={includeFeed} statusFilter={filter} />
        </section>
      )}
    </div>
  )
}
