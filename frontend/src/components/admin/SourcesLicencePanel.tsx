'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import type { AdminSource, SourceLicenceStatus } from '@/types'

export const LICENCE_STATUSES: SourceLicenceStatus[] = [
  'BLOCKED',
  'PERSONAL_ONLY',
  'NEEDS_LICENCE',
  'UNKNOWN',
  'CLEARED',
]

/** Uncleared first, then cleared. Within a status, name A–Z. */
export const LICENCE_SORT_RANK: Record<SourceLicenceStatus, number> = {
  BLOCKED: 0,
  PERSONAL_ONLY: 1,
  NEEDS_LICENCE: 2,
  UNKNOWN: 3,
  CLEARED: 4,
}

export const LICENCE_LABEL: Record<SourceLicenceStatus, string> = {
  CLEARED: 'Cleared',
  NEEDS_LICENCE: 'Needs licence',
  PERSONAL_ONLY: 'Personal only',
  BLOCKED: 'Blocked',
  UNKNOWN: 'Unknown',
}

export function sortSourcesByLicence(sources: AdminSource[]): AdminSource[] {
  return [...sources].sort((a, b) => {
    const ra = LICENCE_SORT_RANK[a.licenceStatus] ?? 99
    const rb = LICENCE_SORT_RANK[b.licenceStatus] ?? 99
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name)
  })
}

export function countByLicence(sources: AdminSource[]): Record<SourceLicenceStatus, number> {
  const counts = Object.fromEntries(LICENCE_STATUSES.map((s) => [s, 0])) as Record<SourceLicenceStatus, number>
  for (const s of sources) counts[s.licenceStatus] = (counts[s.licenceStatus] ?? 0) + 1
  return counts
}

export function filterByLicence(
  sources: AdminSource[],
  status: SourceLicenceStatus | 'ALL',
): AdminSource[] {
  const sorted = sortSourcesByLicence(sources)
  if (status === 'ALL') return sorted
  return sorted.filter((s) => s.licenceStatus === status)
}

function rightsChips(rights: AdminSource['displayRights']): string[] {
  if (!rights) return []
  const chips: string[] = []
  if (rights.headline) chips.push('Headline')
  if (rights.snippetChars > 0) chips.push(`Snippet ${rights.snippetChars}`)
  if (rights.link) chips.push('Link')
  if (rights.embed) chips.push('Embed')
  return chips
}

function typeLabel(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase()
}

/** Presentational table/cards — exported for vitest. */
export function SourcesLicenceTable({
  sources,
  filter,
  onFilter,
}: {
  sources: AdminSource[]
  filter: SourceLicenceStatus | 'ALL'
  onFilter: (next: SourceLicenceStatus | 'ALL') => void
}) {
  const counts = countByLicence(sources)
  const rows = filterByLicence(sources, filter)

  return (
    <div className="g-sources-licence" data-testid="sources-licence-panel">
      <div className="g-stat-row g-licence-summary" aria-label="Licence status counts">
        {LICENCE_STATUSES.map((status) => (
          <div key={status}>
            <strong data-testid={`licence-count-${status}`}>{counts[status]}</strong>
            <span className="g-muted">{LICENCE_LABEL[status]}</span>
          </div>
        ))}
      </div>

      <div className="g-chip-row" role="group" aria-label="Filter by licence status">
        <button type="button" aria-pressed={filter === 'ALL'} onClick={() => onFilter('ALL')}>
          All
        </button>
        {LICENCE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={filter === status}
            onClick={() => onFilter(status)}
          >
            {LICENCE_LABEL[status]}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="g-empty" style={{ padding: 24 }} data-testid="sources-licence-empty">
          <p>
            {sources.length === 0
              ? 'No sources in the registry yet.'
              : `No sources with status “${filter === 'ALL' ? 'any' : LICENCE_LABEL[filter]}”.`}
          </p>
          {sources.length > 0 && filter !== 'ALL' && (
            <p style={{ marginTop: 12 }}>
              <button
                type="button"
                className="g-green-link"
                data-testid="sources-licence-empty-clear"
                onClick={() => onFilter('ALL')}
              >
                Show all →
              </button>
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="g-sources-table-wrap" role="region" aria-label="Sources by licence">
            <table className="g-table g-sources-table">
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Type</th>
                  <th scope="col">Licence</th>
                  <th scope="col">Note</th>
                  <th scope="col">Terms</th>
                  <th scope="col">Display</th>
                  <th scope="col" className="num">Rumours</th>
                  <th scope="col" className="num">Reliability</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} data-testid="sources-licence-row" data-licence={s.licenceStatus}>
                    <td className="g-sources-name">{s.name}</td>
                    <td>{typeLabel(s.type)}</td>
                    <td>
                      <span className={`g-licence-badge g-licence-${s.licenceStatus.toLowerCase().replace(/_/g, '-')}`}>
                        {LICENCE_LABEL[s.licenceStatus]}
                      </span>
                    </td>
                    <td className="g-sources-note">{s.licenceNote ?? '—'}</td>
                    <td>
                      {s.termsUrl ? (
                        <a href={s.termsUrl} target="_blank" rel="noopener noreferrer" className="g-green-link">
                          Terms
                        </a>
                      ) : (
                        <span className="g-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="g-rights-chips">
                        {rightsChips(s.displayRights).length === 0
                          ? <span className="g-muted">—</span>
                          : rightsChips(s.displayRights).map((c) => (
                              <span key={c} className="g-rights-chip">{c}</span>
                            ))}
                      </span>
                    </td>
                    <td className="num">{s._count.rumours}</td>
                    <td className="num">{Math.round(s.reliabilityScore * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="g-sources-cards" aria-label="Sources by licence">
            {rows.map((s) => (
              <li key={s.id} className="g-sources-card" data-testid="sources-licence-card" data-licence={s.licenceStatus}>
                <div className="g-admin-head">
                  <strong>{s.name}</strong>
                  <span className={`g-licence-badge g-licence-${s.licenceStatus.toLowerCase().replace(/_/g, '-')}`}>
                    {LICENCE_LABEL[s.licenceStatus]}
                  </span>
                </div>
                <p className="g-note">{typeLabel(s.type)} · {Math.round(s.reliabilityScore * 100)}% · {s._count.rumours} rumours</p>
                <p className="g-sources-note">{s.licenceNote ?? 'No licence note.'}</p>
                <div className="g-rights-chips">
                  {rightsChips(s.displayRights).map((c) => (
                    <span key={c} className="g-rights-chip">{c}</span>
                  ))}
                </div>
                {s.termsUrl && (
                  <a href={s.termsUrl} target="_blank" rel="noopener noreferrer" className="g-green-link">
                    Open terms
                  </a>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default function SourcesLicencePanel() {
  const [sources, setSources] = useState<AdminSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<SourceLicenceStatus | 'ALL'>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSources(await api.admin.sources())
    } catch {
      setError('Failed to load sources — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stable = useMemo(() => sources, [sources])

  if (loading) {
    return (
      <div className="g-sources-licence" data-testid="sources-licence-loading" aria-busy="true">
        <p className="g-note" style={{ padding: '16px 24px' }}>Loading sources…</p>
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ padding: '16px 24px' }} data-testid="sources-licence-error">
        <p className="g-error" role="alert">{error}</p>
        <p style={{ marginTop: 12 }}>
          <button
            type="button"
            className="g-green-link"
            data-testid="sources-licence-error-retry"
            onClick={() => void load()}
          >
            Retry →
          </button>
        </p>
      </div>
    )
  }

  return <SourcesLicenceTable sources={stable} filter={filter} onFilter={setFilter} />
}
