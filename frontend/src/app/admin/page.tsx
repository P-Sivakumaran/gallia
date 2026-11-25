'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AdminRumour, AdminSource, Player, RumourStatus } from '@/types'
import DeskPage from '@/components/desk/DeskPage'
import DeskStatus from '@/components/desk/DeskStatus'
import ReviewQueue from '@/components/admin/ReviewQueue'

const STATUS_FILTERS: Array<RumourStatus | 'ALL'> = ['ALL', 'PENDING', 'HOT', 'COMPLETED', 'FAILED', 'DENIED']


function RumoursPanel() {
  const [filter, setFilter] = useState<RumourStatus | 'ALL'>('PENDING')
  const [rumours, setRumours] = useState<AdminRumour[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (status: RumourStatus | 'ALL') => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.admin.rumours(status === 'ALL' ? undefined : status)
      setRumours(data)
    } catch {
      setError('Failed to load rumours — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  async function setOutcome(id: number, status: 'COMPLETED' | 'FAILED' | 'DENIED') {
    setPendingId(id)
    try {
      await api.admin.setOutcome(id, status)
      setRumours((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError(`Failed to set rumour ${id} to ${status}`)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div>
      <div className="g-chip-row" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((s) => (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {error && <p className="g-error" style={{ padding: '16px 24px' }}>{error}</p>}
      {loading && <p className="g-note" style={{ padding: '16px 24px' }}>Loading…</p>}
      {!loading && rumours.length === 0 && !error && (
        <p className="g-note" style={{ padding: '16px 24px' }}>No rumours match this filter.</p>
      )}

      <ul className="g-list">
        {rumours.map((r) => (
          <li key={r.id} className="g-admin-item">
            <div className="g-admin-actions" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                <div className="g-admin-head">
                  <strong>{r.player.name}</strong>
                  <DeskStatus status={r.status} />
                  {r.contradicts !== null && <span className="g-tag">contradicts #{r.contradicts}</span>}
                </div>
                <div className="g-admin-meta">
                  <span>{r.fromClub.name}</span>
                  <span className="sep">→</span>
                  <span>{r.toClub.name}</span>
                  <span className="sep">·</span>
                  <span className="mono">{Math.round(r.computedLikelihood)}%</span>
                  <span className="sep">·</span>
                  <span>{r.source.name} ({Math.round(r.source.reliabilityScore * 100)}%)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={pendingId === r.id || r.evidence.length === 0}
                  title={r.evidence.length === 0 ? 'No source evidence found for this rumour — cannot set outcome' : undefined}
                  onClick={() => setOutcome(r.id, 'COMPLETED')}
                  className="g-btn ok"
                >
                  Completed
                </button>
                <button
                  disabled={pendingId === r.id || r.evidence.length === 0}
                  title={r.evidence.length === 0 ? 'No source evidence found for this rumour; cannot set outcome' : undefined}
                  onClick={() => setOutcome(r.id, 'FAILED')}
                  className="g-btn bad"
                >
                  Failed
                </button>
                <button
                  disabled={pendingId === r.id || r.evidence.length === 0}
                  title={r.evidence.length === 0 ? 'No source evidence found for this rumour; cannot set outcome' : undefined}
                  onClick={() => setOutcome(r.id, 'DENIED')}
                  className="g-btn bad"
                >
                  Denied
                </button>
              </div>
            </div>

            {/* Evidence: every action above must be traceable to one of these */}
            <div className="g-admin-evidence">
              {r.evidence.length === 0 ? (
                <p className="g-note">No source articles linked; outcome cannot be set manually.</p>
              ) : (
                <ul className="g-list" style={{ display: 'grid', gap: 4 }}>
                  {r.evidence.map((e, i) => (
                    <li key={i}>
                      <span className="g-muted">{e.sourceName}:</span>
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {e.headline}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SourcesPanel() {
  const [sources, setSources] = useState<AdminSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.admin
      .sources()
      .then(setSources)
      .catch(() => setError('Failed to load sources — is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="g-note" style={{ padding: '16px 24px' }}>Loading…</p>
  if (error) return <p className="g-error" style={{ padding: '16px 24px' }}>{error}</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="g-table">
        <thead>
          <tr>
            <th>SOURCE</th>
            <th>TYPE</th>
            <th className="num">RELIABILITY</th>
            <th className="num">HITS</th>
            <th className="num">MISSES</th>
            <th className="num">RUMOURS</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id}>
              <td style={{ fontWeight: 550, color: '#edf1f5' }}>{s.name}</td>
              <td className="g-muted">{s.type.replace(/_/g, ' ').toLowerCase()}</td>
              <td className="num">{Math.round(s.reliabilityScore * 100)}%</td>
              <td className="num" style={{ color: 'var(--signal-fire)' }}>{s.hitCount}</td>
              <td className="num" style={{ color: 'var(--signal-denied)' }}>{s.missCount}</td>
              <td className="num">{s._count.rumours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

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
        {tab === 'sources' && <SourcesPanel />}
        {tab === 'enrich' && <EnrichPanel />}
      </section>
    </DeskPage>
  )
}
