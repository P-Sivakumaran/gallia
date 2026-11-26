'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AdminReviewItem, ReviewReason } from '@/types'
import DeskStatus from '@/components/desk/DeskStatus'
import ClubLocationsReview from './ClubLocationsReview'

type Outcome = 'COMPLETED' | 'FAILED' | 'DENIED'

const REASON_LABEL: Record<ReviewReason, string> = {
  'window-closed': 'Window closed, not confirmed',
  'text-signal': 'Article wording',
}

const OUTCOME_BUTTON: Record<Outcome, { label: string; className: string }> = {
  COMPLETED: { label: 'Completed', className: 'ok' },
  FAILED: { label: 'Failed', className: 'bad' },
  DENIED: { label: 'Denied', className: 'bad' },
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ReviewCard({ item, onResolved }: { item: AdminReviewItem; onResolved: (id: number) => void }) {
  const [knownAt, setKnownAt] = useState(toDateInput(item.suggestedKnownAt))
  const [pending, setPending] = useState<Outcome | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resolve(outcome: Outcome) {
    if (!knownAt) {
      setError('Set the date the outcome became public first.')
      return
    }
    setPending(outcome)
    setError(null)
    try {
      await api.admin.setOutcome(item.id, outcome, knownAt)
      onResolved(item.id)
    } catch {
      setError(`Could not set ${outcome.toLowerCase()}. Check the backend and your admin session.`)
    } finally {
      setPending(null)
    }
  }

  const inputId = `known-at-${item.id}`

  return (
    <li className="g-admin-item" data-testid="review-item">
      <div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div className="g-admin-head">
            <strong>{item.player.name}</strong>
            <DeskStatus status={item.status} />
            {item.reasons.map((r) => (
              <span key={r} className="g-tag">
                {REASON_LABEL[r]}
              </span>
            ))}
          </div>
          <p className="g-admin-meta">
            <span>{item.fromClub.name}</span>
            <span className="sep">→</span>
            <span>{item.toClub.name}</span>
            <span className="sep">·</span>
            <span>{item.window.toLowerCase()} window</span>
            <span className="sep">·</span>
            <span className="mono">{Math.round(item.computedLikelihood)}%</span>
            <span className="sep">·</span>
            <span>first reported {formatDate(item.rumourDate)} by {item.source.name}</span>
          </p>
        </div>
      </div>

      <div className="g-admin-evidence">
        {item.textSignals.length === 0 ? (
          <p className="g-note">
            No article wording to go on. Check an official club source before resolving.
          </p>
        ) : (
          <ul className="g-list" style={{ display: 'grid', gap: 4 }}>
            {item.textSignals.map((s, i) => (
              <li key={i}>
                <span style={{ color: 'var(--g-c-e6ecf1)', fontWeight: 550 }}>{s.outcome === 'COMPLETED' ? 'Suggests done' : 'Suggests off'}</span>
                <span className="g-muted">
                  {s.sourceName}, {formatDate(s.publishedAt)}:
                </span>
                <a href={s.link} target="_blank" rel="noopener noreferrer" >
                  {s.headline}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="g-admin-actions">
        <div className="g-field">
          <label htmlFor={inputId}>
            Outcome public on
          </label>
          <input
            id={inputId}
            type="date"
            value={knownAt}
            max={today()}
            onChange={(e) => setKnownAt(e.target.value)}
            className="g-input"
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(Object.keys(OUTCOME_BUTTON) as Outcome[]).map((o) => (
            <button
              key={o}
              disabled={pending !== null}
              onClick={() => resolve(o)}
              className={`g-btn ${OUTCOME_BUTTON[o].className}`}
            >
              {pending === o ? 'Saving…' : OUTCOME_BUTTON[o].label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="g-error" role="alert">{error}</p>}
    </li>
  )
}

export default function ReviewQueue() {
  const [items, setItems] = useState<AdminReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await api.admin.reviewQueue())
    } catch {
      setError('Failed to load the review queue. Is the backend running, and are you signed in as admin?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <p className="g-panel-intro">
        Rumours that need a decision. Article wording is a lead, not proof: confirm against an official club source,
        then set the date the outcome became public. The scorecard only scores estimates made before that date.
      </p>
      {error && <p className="g-error" style={{ padding: '16px 24px' }}>{error}</p>}
      {loading && <p className="g-note" style={{ padding: '16px 24px' }}>Loading…</p>}
      {!loading && !error && (
        <p className="g-note" style={{ padding: '12px 24px', borderBottom: '1px solid var(--g-line)' }} data-testid="review-count">
          {items.length === 0 ? 'Nothing waiting for review.' : `${items.length} waiting for review`}
        </p>
      )}
      <ul className="g-list">
        {items.map((item) => (
          <ReviewCard key={item.id} item={item} onResolved={(id) => setItems((prev) => prev.filter((r) => r.id !== id))} />
        ))}
      </ul>
      <ClubLocationsReview />
    </div>
  )
}
