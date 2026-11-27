'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { Player } from '@/types'
import DeskPage from '@/components/desk/DeskPage'
import ReviewQueue from '@/components/admin/ReviewQueue'
import SourcesLicencePanel from '@/components/admin/SourcesLicencePanel'
import RumoursPanel from '@/components/admin/RumoursPanel'

function EnrichPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  async function search(q: string) {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      setResults(await api.players.search(q))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function enrich(playerId: number, playerName: string) {
    setMessage(null)
    try {
      await api.admin.enrichPlayer(playerId)
      setMessage(`Queued Wikidata enrichment for ${playerName}.`)
    } catch {
      setMessage(`Failed to queue enrichment for ${playerName}.`)
    }
  }

  return (
    <div>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--g-line)' }}>
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search player to re-enrich…"
          aria-label="Search player to re-enrich"
          className="g-input"
          style={{ width: '100%' }}
        />
        {searching && <p className="g-note" style={{ marginTop: 8 }}>Searching…</p>}
        {message && <p className="g-note" style={{ marginTop: 8, color: 'var(--signal-fire)' }}>{message}</p>}
      </div>
      <ul className="g-list">
        {results.map((p) => (
          <li key={p.id} className="g-admin-item" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
            <div className="g-admin-head" style={{ display: 'grid', gap: 2 }}>
              <strong>{p.name}</strong>
              <span className="g-note">{p.position} · {p.nationality ?? 'Unknown nationality'}</span>
            </div>
            <button type="button" onClick={() => enrich(p.id, p.name)} className="g-btn ok">
              Enrich
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<'review' | 'rumours' | 'sources' | 'enrich'>('review')

  return (
    <DeskPage
      eyebrow="OPERATIONS DESK"
      title="Admin"
      accent="."
      intro="Review rumours awaiting an outcome, resolve rumours, check source reliability, and trigger player profile enrichment."
    >
      <section className="g-panel">
        <div className="g-admin-tabs" role="tablist" aria-label="Admin sections">
          {(['review', 'rumours', 'sources', 'enrich'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'review' && <ReviewQueue />}
        {tab === 'rumours' && <RumoursPanel />}
        {tab === 'sources' && <SourcesLicencePanel />}
        {tab === 'enrich' && <EnrichPanel />}
      </section>
    </DeskPage>
  )
}
