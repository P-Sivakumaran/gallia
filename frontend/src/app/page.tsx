import { Suspense } from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { api } from '@/lib/api'
import FilterBar from '@/components/FilterBar'
import LiveRumourFeed from '@/components/LiveRumourFeed'
import RemoveAdsBanner from '@/components/RemoveAdsBanner'
import type { RumourStatus, TransferWindow } from '@/types'

interface SearchParams {
  league?: string
  position?: string
  status?: string
  window?: string
  page?: string
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page ?? '1', 10)

  const { data: rumours, total, limit } = await api.rumours.list({
    league: resolvedSearchParams.league,
    position: resolvedSearchParams.position,
    status: resolvedSearchParams.status as RumourStatus | undefined,
    window: resolvedSearchParams.window as TransferWindow | undefined,
    page,
    limit: 20,
  })

  const stats = await api.stats.overview()
  const totalPages = Math.ceil(total / limit)
  const cookieStore = await cookies()
  const adsEnabled = !cookieStore.get('ads_removed')

  return (
    <div className="space-y-8">
      {adsEnabled && <RemoveAdsBanner />}
      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Rumours', value: stats.totalRumours },
          { label: 'Hot Rumours', value: stats.hotRumours, accent: 'text-hot-fg' },
          { label: 'Completed', value: stats.completedRumours, accent: 'text-pitch-500' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl border border-line-subtle bg-surface-panel/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${accent ?? 'text-ink-primary'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Network CTA */}
      <Link
        href="/network"
        className="flex items-center gap-3 rounded-xl border border-line/60 bg-surface-raised/40 px-5 py-3 text-sm text-ink-soft transition-colors duration-150 hover:border-pitch-500/40 hover:bg-surface-raised hover:text-ink-primary group"
      >
        <span className="text-lg">🕸</span>
        <span>View transfer network graph</span>
        <span className="ml-auto text-ink-muted group-hover:text-pitch-500">→</span>
      </Link>

      {/* Filters */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Filter rumours
        </h2>
        <Suspense>
          <FilterBar />
        </Suspense>
      </section>

      {/* Live feed */}
      <LiveRumourFeed initialRumours={rumours} total={total} adsEnabled={adsEnabled} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?page=${p}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-pitch-500 text-ink-primary'
                  : 'border border-line text-ink-secondary hover:border-line-emphasis hover:text-ink-primary'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
