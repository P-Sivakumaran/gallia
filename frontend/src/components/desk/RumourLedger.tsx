'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { useFeed } from '@/components/live/RumourFeedProvider'
import { feeLabel } from '@/lib/format'
import { resolveDisplayOrigin } from '@/lib/rumourOrigin'
import type { LiveChange } from '@/lib/useRumourFeed'
import type { Rumour, RumourStatus } from '@/types'

const STATUS_TABS: Array<{ value: RumourStatus | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'HOT', label: 'Hot' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
]
const LEAGUES = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
const WINDOWS = ['SUMMER', 'WINTER']

const STATUS_CLASS: Record<RumourStatus, string> = {
  HOT: 'g-status',
  PENDING: 'g-status g-status-smoke',
  COMPLETED: 'g-status g-status-confirmed',
  FAILED: 'g-status g-status-denied',
  DENIED: 'g-status g-status-denied',
}
const PROB_CLASS: Record<RumourStatus, string> = {
  HOT: '',
  PENDING: 'smoke',
  COMPLETED: 'confirmed',
  FAILED: 'denied',
  DENIED: 'denied',
}

function monogram(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase()
}

function useParamLink() {
  const params = useSearchParams()
  return useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      const q = next.toString()
      return q ? `?${q}` : '?'
    },
    [params],
  )
}

export function LedgerTools() {
  const params = useSearchParams()
  const router = useRouter()
  const link = useParamLink()
  const status = params.get('status')
  const select = (key: string, label: string, options: string[]) => (
    <select
      aria-label={label}
      value={params.get(key) ?? ''}
      data-active={params.get(key) ? 'true' : undefined}
      onChange={(e) => router.push(link(key, e.target.value || null))}
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{/^[A-Z]{4,}$/.test(o) ? o.charAt(0) + o.slice(1).toLowerCase() : o}</option>)}
    </select>
  )
  return (
    <div className="g-ledger-tools">
      <nav className="g-feed-tabs" aria-label="Filter by status">
        {STATUS_TABS.map((t) => (
          <Link key={t.label} href={link('status', t.value)} aria-current={status === t.value || (!status && !t.value) ? 'true' : undefined}>{t.label}</Link>
        ))}
      </nav>
      <div className="g-filter-controls">
        {select('league', 'All leagues', LEAGUES)}
        {select('position', 'All positions', POSITIONS)}
        {select('window', 'Any window', WINDOWS)}
      </div>
    </div>
  )
}

/** One rumour as a desk table row. `change` is the last live update, when on a live feed. */
export function LedgerRow({ rumour, change }: { rumour: Rumour; change?: LiveChange }) {
  const origin = resolveDisplayOrigin(rumour)
  const likelihood = Math.round(rumour.computedLikelihood)
  const confirmed = rumour.status === 'COMPLETED'
  return (
    <div className="g-ledger-row" data-testid="ledger-row">
      <div className="g-feed-player">
        <span className={`g-player-monogram ${confirmed ? 'confirmed' : ''}`} aria-hidden="true">{monogram(rumour.player.name)}</span>
        <span>
          <span className="g-player-name">
            <Link href={`/rumour/${rumour.id}`}>{rumour.player.name}</Link>
            {rumour.player.position && <span className="g-position">{rumour.player.position}</span>}
          </span>
          <span className="g-feed-route">
            <Link href={`/club/${origin.club.id}`}>{origin.club.name}</Link>{origin.unconfirmed && ' (unconfirmed)'}
            {' '}<span aria-hidden="true">→</span><span className="g-sr-only">to</span>{' '}
            <Link href={`/club/${rumour.toClub.id}`}>{rumour.toClub.name}</Link>
          </span>
        </span>
      </div>
      <div className="g-ledger-source">
        <span>{rumour.source.name}</span>
        <span>{rumour.window.toLowerCase()} · {rumour.distinctSourceCount} src</span>
      </div>
      <span className="g-ledger-fee">{feeLabel(rumour.reportedFeeMin, rumour.reportedFeeMax, rumour.currency)}</span>
      <div className={`g-row-prob ${PROB_CLASS[rumour.status]}`}>
        <strong>{likelihood}<small>%</small></strong>
        <span className="g-probability-track" aria-hidden="true"><i style={{ width: `${likelihood}%` }} /></span>
        {change && change.delta !== 0 && (
          <span key={change.seq} className={`g-live-change ${change.delta < 0 ? 'negative' : ''}`} data-testid="delta-chip">
            {change.delta > 0 ? '↗ +' : '↘ '}{change.delta}
          </span>
        )}
      </div>
      <div className="g-ledger-status"><span className={STATUS_CLASS[rumour.status]}><span />{rumour.status}</span></div>
    </div>
  )
}

export default function RumourLedger({ total, page, totalPages }: { total: number; page: number; totalPages: number }) {
  const { rumours, live } = useFeed()
  const params = useSearchParams()
  const pageHref = (p: number) => {
    const next = new URLSearchParams(params.toString())
    next.set('page', String(p))
    return `?${next.toString()}`
  }
  return (
    <section className="g-panel" aria-labelledby="ledger-title">
      <div className="g-panel-heading">
        <h2 id="ledger-title">Rumour ledger</h2>
        <span className="g-count-label">{total} RUMOURS</span>
      </div>
      <LedgerTools />
      <div className="g-ledger-columns" aria-hidden="true">
        <span>PLAYER / TRANSFER ROUTE</span><span>SOURCE</span><span>FEE</span><span>LIKELIHOOD</span><span>STATUS</span>
      </div>
      {rumours.map((r) => <LedgerRow key={r.id} rumour={r} change={live[r.id]} />)}
      {rumours.length === 0 && <p className="g-empty" style={{ padding: 24 }}>No rumours match these filters.</p>}
      {totalPages > 1 && (
        <nav className="g-pagination" aria-label="Pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={pageHref(p)} aria-current={p === page ? 'page' : undefined}>{p}</Link>
          ))}
        </nav>
      )}
    </section>
  )
}

/** A titled panel of rumour rows without filters or live updates (player and club pages). */
export function RumourRowsPanel({ title, rumours, empty }: { title: string; rumours: Rumour[]; empty: string }) {
  return (
    <section className="g-panel" aria-label={title}>
      <div className="g-panel-heading">
        <h2>{title}</h2>
        <span className="g-count-label">{rumours.length} RUMOUR{rumours.length === 1 ? '' : 'S'}</span>
      </div>
      {rumours.length > 0 && (
        <div className="g-ledger-columns" aria-hidden="true">
          <span>PLAYER / TRANSFER ROUTE</span><span>SOURCE</span><span>FEE</span><span>LIKELIHOOD</span><span>STATUS</span>
        </div>
      )}
      {rumours.map((r) => <LedgerRow key={r.id} rumour={r} />)}
      {rumours.length === 0 && <p className="g-empty" style={{ padding: 24 }}>{empty}</p>}
    </section>
  )
}
