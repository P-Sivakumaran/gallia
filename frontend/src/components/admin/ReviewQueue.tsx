'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { AdminReviewItem, ReviewReason } from '@/types'
import StatusBadge from '@/components/StatusBadge'

type Outcome = 'COMPLETED' | 'FAILED' | 'DENIED'

const REASON_LABEL: Record<ReviewReason, string> = {
  'window-closed': 'Window closed, not confirmed',
  'text-signal': 'Article wording',
}

const OUTCOME_BUTTON: Record<Outcome, { label: string; className: string }> = {
  COMPLETED: { label: 'Completed', className: 'border-completed/40 bg-completed/10 text-completed-fg hover:bg-completed/20' },
  FAILED: { label: 'Failed', className: 'border-failed/40 bg-failed/10 text-failed-fg hover:bg-failed/20' },
  DENIED: { label: 'Denied', className: 'border-denied/40 bg-denied/10 text-denied-fg hover:bg-denied/20' },
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
    <li className="space-y-3 rounded-xl border border-line/60 bg-surface-raised/60 p-3" data-testid="review-item">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink-primary">{item.player.name}</span>
            <StatusBadge status={item.status} />
            {item.reasons.map((r) => (
              <span
                key={r}
                className="rounded-full border border-caution/40 bg-caution/10 px-2 py-0.5 text-label font-semibold text-caution-fg"
              >
                {REASON_LABEL[r]}
              </span>
            ))}
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-secondary">
            <span>{item.fromClub.name}</span>
            <span className="text-ink-faint">→</span>
            <span>{item.toClub.name}</span>
            <span className="text-ink-faint">·</span>
            <span>{item.window.toLowerCase()} window</span>
            <span className="text-ink-faint">·</span>
            <span className="font-mono">{Math.round(item.computedLikelihood)}%</span>
            <span className="text-ink-faint">·</span>
            <span>first reported {formatDate(item.rumourDate)} by {item.source.name}</span>
          </p>
        </div>
      </div>

      <div className="border-t border-line/60 pt-2">
        {item.textSignals.length === 0 ? (
          <p className="text-xs text-ink-muted">
            No article wording to go on. Check an official club source before resolving.
          </p>
        ) : (
          <ul className="space-y-1">
            {item.textSignals.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-ink-soft">{s.outcome === 'COMPLETED' ? 'Suggests done' : 'Suggests off'}</span>
                <span className="text-ink-muted">
                  {s.sourceName}, {formatDate(s.publishedAt)}:
                </span>
                <a href={s.link} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-pitch-500 hover:underline">
                  {s.headline}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor={inputId} className="block text-label text-ink-muted">
            Outcome public on
          </label>
          <input
            id={inputId}
            type="date"
            value={knownAt}
            max={today()}
            onChange={(e) => setKnownAt(e.target.value)}
            className="rounded-lg border border-line bg-surface-panel px-2 py-1 text-sm text-ink-primary focus:border-pitch-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(OUTCOME_BUTTON) as Outcome[]).map((o) => (
            <button
              key={o}
              disabled={pending !== null}
              onClick={() => resolve(o)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${OUTCOME_BUTTON[o].className}`}
            >
              {pending === o ? 'Saving…' : OUTCOME_BUTTON[o].label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-xs text-failed-fg" role="alert">{error}</p>}
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
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-ink-secondary">
        Rumours that need a decision. Article wording is a lead, not proof: confirm against an official club source,
        then set the date the outcome became public. The scorecard only scores estimates made before that date.
      </p>
      {error && <p className="text-sm text-failed-fg">{error}</p>}
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {!loading && !error && (
        <p className="text-xs text-ink-muted" data-testid="review-count">
          {items.length === 0 ? 'Nothing waiting for review.' : `${items.length} waiting for review`}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <ReviewCard key={item.id} item={item} onResolved={(id) => setItems((prev) => prev.filter((r) => r.id !== id))} />
        ))}
      </ul>
    </div>
  )
}
