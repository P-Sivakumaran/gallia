'use client'

import { Fragment } from 'react'
import RumourCard from './RumourCard'
import AdSlot from './AdSlot'
import { useFeed } from './live/RumourFeedProvider'
import type { RumourStatus } from '@/types'

interface Props {
  total: number
  adsEnabled?: boolean
}

const AD_EVERY_N_CARDS = 5

const COUNTS: Array<{ status: RumourStatus; label: string; className: string }> = [
  { status: 'HOT', label: 'hot', className: 'text-hot-fg' },
  { status: 'PENDING', label: 'pending', className: 'text-pending' },
  { status: 'COMPLETED', label: 'done', className: 'text-completed-fg' },
  { status: 'FAILED', label: 'failed', className: 'text-failed-fg' },
]

export default function LiveRumourFeed({ total, adsEnabled = false }: Props) {
  const { rumours, live } = useFeed()

  return (
    <section aria-labelledby="feed-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="feed-title" className="text-2xl font-black tracking-display text-ink-primary">
          {total} rumour{total !== 1 ? 's' : ''}
        </h2>
        {/* LIVE FEED pill from the raea hero loop: status counts for the rumours on this page */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-pitch-500/30 bg-field-deep/90 px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wide">
          <span className="flex items-center gap-2 text-pitch-100">
            <span aria-hidden className="h-2 w-2 rounded-full bg-pitch-500" />
            Live feed
          </span>
          <span aria-hidden className="h-4 w-px bg-line" />
          {COUNTS.map((c) => (
            <span key={c.status} className={c.className}>
              {rumours.filter((r) => r.status === c.status).length} {c.label}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {rumours.map((r, i) => (
          <Fragment key={r.id}>
            <RumourCard rumour={r} live={live[r.id]} index={i} />
            {adsEnabled && i > 0 && (i + 1) % AD_EVERY_N_CARDS === 0 && (
              <div className="lg:col-span-2">
                <AdSlot index={Math.floor(i / AD_EVERY_N_CARDS)} />
              </div>
            )}
          </Fragment>
        ))}
        {rumours.length === 0 && (
          <div className="rounded-xl border border-line/60 bg-card shadow-card p-12 text-center lg:col-span-2">
            <p className="text-ink-muted">No rumours match your filters.</p>
          </div>
        )}
      </div>
    </section>
  )
}
