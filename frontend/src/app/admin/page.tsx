'use client'

import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import type { AdminRumour, AdminSource, Player, RumourStatus } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import SectionKicker from '@/components/SectionKicker'

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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={clsx(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === s
                ? 'border-pitch-500 bg-pitch-500/20 text-pitch-500'
                : 'border-line bg-transparent text-ink-secondary hover:border-line-emphasis hover:text-ink-body',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-failed-fg">{error}</p>}
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {!loading && rumours.length === 0 && !error && (
        <p className="text-sm text-ink-muted">No rumours match this filter.</p>
      )}

      <div className="space-y-2">
        {rumours.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-xl border border-line/60 bg-surface-raised/60 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-primary">{r.player.name}</span>
                  <StatusBadge status={r.status} />
                  {r.contradicts !== null && (
                    <span className="rounded-full border border-caution/40 bg-caution/20 px-2 py-0.5 text-xs font-semibold text-caution-fg">
                      contradicts #{r.contradicts}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-secondary">
                  <span>{r.fromClub.name}</span>
                  <span className="text-ink-faint">→</span>
                  <span>{r.toClub.name}</span>
                  <span className="text-ink-faint">·</span>
                  <span className="font-mono">{Math.round(r.computedLikelihood)}%</span>
                  <span className="text-ink-faint">·</span>
                  <span>{r.source.name} ({Math.round(r.source.reliabilityScore * 100)}%)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={pendingId === r.id || r.evidence.length === 0}
                  title={r.evidence.length === 0 ? 'No source evidence found for this rumour — cannot set outcome' : undefined}
                  onClick={() => setOutcome(r.id, 'COMPLETED')}
                  className="rounded-lg border border-completed/40 bg-completed/10 px-3 py-1.5 text-xs font-semibold text-completed-fg transition-colors hover:bg-completed/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Completed
                </button>
                <button
                  disabled={pendingId === r.id || r.evidence.length === 0}
                  title={r.evidence.length === 0 ? 'No source evidence found for this rumour; cannot set outcome' : undefined}
                  onClick={() => setOutcome(r.id, 'FAILED')}
                  className="rounded-lg border border-failed/40 bg-failed/10 px-3 py-1.5 text-xs font-semibold text-failed-fg transition-colors hover:bg-failed/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Failed
                </button>
                <button
                  disabled={pendingId === r.id || r.evidence.length === 0}
                  title={r.evidence.length === 0 ? 'No source evidence found for this rumour; cannot set outcome' : undefined}
                  onClick={() => setOutcome(r.id, 'DENIED')}
                  className="rounded-lg border border-denied/40 bg-denied/10 px-3 py-1.5 text-xs font-semibold text-denied-fg transition-colors hover:bg-denied/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Denied
                </button>
              </div>
            </div>

            {/* Evidence: every action above must be traceable to one of these */}
            <div className="border-t border-line/60 pt-2">
              {r.evidence.length === 0 ? (
                <p className="text-xs text-ink-muted">No source articles linked; outcome cannot be set manually.</p>
              ) : (
                <ul className="space-y-1">
                  {r.evidence.map((e, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="text-ink-muted">{e.sourceName}:</span>
                      <a
                        href={e.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-pitch-500 hover:underline"
                      >
                        {e.headline}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
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

  if (loading) return <p className="text-sm text-ink-muted">Loading…</p>
  if (error) return <p className="text-sm text-failed-fg">{error}</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-line/60">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised/80 text-left text-xs uppercase tracking-wide text-ink-muted">
          <tr>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Reliability</th>
            <th className="px-3 py-2">Hits</th>
            <th className="px-3 py-2">Misses</th>
            <th className="px-3 py-2">Rumours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {sources.map((s) => (
            <tr key={s.id} className="bg-surface-panel/40">
              <td className="px-3 py-2 font-medium text-ink-primary">{s.name}</td>
              <td className="px-3 py-2 text-ink-secondary">{s.type}</td>
              <td className="px-3 py-2 font-mono text-ink-soft">{Math.round(s.reliabilityScore * 100)}%</td>
              <td className="px-3 py-2 text-completed-fg">{s.hitCount}</td>
              <td className="px-3 py-2 text-failed-fg">{s.missCount}</td>
              <td className="px-3 py-2 text-ink-secondary">{s._count.rumours}</td>
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
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Search player to re-enrich…"
        className="w-full rounded-lg border border-line bg-surface-panel px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-pitch-500 focus:outline-none"
      />
      {searching && <p className="text-sm text-ink-muted">Searching…</p>}
      {message && <p className="text-sm text-pitch-500">{message}</p>}
      <div className="space-y-2">
        {results.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-line/60 bg-surface-raised/60 p-3"
          >
            <div>
              <p className="font-medium text-ink-primary">{p.name}</p>
              <p className="text-xs text-ink-muted">
                {p.position} · {p.nationality ?? 'Unknown nationality'}
              </p>
            </div>
            <button
              onClick={() => enrich(p.id, p.name)}
              className="rounded-lg border border-pitch-500/40 bg-pitch-500/10 px-3 py-1.5 text-xs font-semibold text-pitch-500 transition-colors hover:bg-pitch-500/20"
            >
              Enrich
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<'rumours' | 'sources' | 'enrich'>('rumours')

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SectionKicker>Operations Desk</SectionKicker>
        <h1 className="text-3xl font-black tracking-display text-ink-primary sm:text-4xl">
          Operations <span className="text-pitch-500">Admin.</span>
        </h1>
        <p className="max-w-2xl text-sm text-ink-secondary">
          Manually resolve rumours, review source reliability scorecards, and trigger player profile enrichment.
        </p>
      </div>

      <div className="flex gap-2 border-b border-line-subtle">
        {(['rumours', 'sources', 'enrich'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors',
              tab === t ? 'border-pitch-500 text-ink-primary' : 'border-transparent text-ink-muted hover:text-ink-soft',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'rumours' && <RumoursPanel />}
      {tab === 'sources' && <SourcesPanel />}
      {tab === 'enrich' && <EnrichPanel />}
    </div>
  )
}
