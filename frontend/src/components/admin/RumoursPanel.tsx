'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AdminRumour, RumourStatus } from '@/types'
import DeskStatus from '@/components/desk/DeskStatus'

const STATUS_FILTERS: Array<RumourStatus | 'ALL'> = ['ALL', 'PENDING', 'HOT', 'COMPLETED', 'FAILED', 'DENIED']

export default function RumoursPanel() {
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

      {error && (
        <div style={{ padding: '16px 24px' }} data-testid="admin-rumours-error">
          <p className="g-error" role="alert">{error}</p>
          <p style={{ marginTop: 12 }}>
            <button
              type="button"
              className="g-green-link"
              data-testid="admin-rumours-error-retry"
              onClick={() => void load(filter)}
            >
              Retry →
            </button>
          </p>
        </div>
      )}
      {loading && <p className="g-note" style={{ padding: '16px 24px' }}>Loading…</p>}
      {!loading && rumours.length === 0 && !error && (
        <div className="g-note" style={{ padding: '16px 24px' }} data-testid="admin-rumours-empty">
          <p>No rumours match this filter.</p>
          {filter !== 'ALL' && (
            <p style={{ marginTop: 12 }}>
              <button
                type="button"
                className="g-green-link"
                data-testid="admin-rumours-empty-clear"
                onClick={() => setFilter('ALL')}
              >
                Show all →
              </button>
            </p>
          )}
        </div>
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
