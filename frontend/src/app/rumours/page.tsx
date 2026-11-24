import { Suspense } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import FilterBar from '@/components/FilterBar'
import LiveRumourFeed from '@/components/LiveRumourFeed'
import SectionKicker from '@/components/SectionKicker'
import HomeHero from '@/components/live/HomeHero'
import { RumourFeedProvider } from '@/components/live/RumourFeedProvider'
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

  return (
    <RumourFeedProvider initialRumours={rumours}>
    <div className="space-y-12">
      <HomeHero />

      {/* Desk strip: the totals, in the raea stat-cell style */}
      <dl className="grid grid-cols-3 divide-x divide-line/60 overflow-hidden rounded-2xl border border-line/60 bg-card shadow-card">
        {[
          { label: 'Rumours tracked', value: stats.totalRumours, accent: 'text-ink-primary' },
          { label: 'Hot now', value: stats.hotRumours, accent: 'text-hot-fg' },
          { label: 'Signed', value: stats.completedRumours, accent: 'text-completed-fg' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="px-4 py-4 sm:px-6 sm:py-5">
            <SectionKicker as="dt">{label}</SectionKicker>
            <dd className={`mt-1 font-mono text-3xl font-extrabold tabular-nums sm:text-4xl ${accent}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {/* Network CTA */}
      <Link
        href="/network"
        className="group flex items-center gap-4 rounded-xl border border-line/60 bg-card px-5 py-4 text-ink-soft shadow-card transition-colors duration-150 hover:border-pitch-500/50 hover:text-ink-primary"
      >
        <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8 text-pitch-500">
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="16" cy="16" r="14" strokeOpacity="0.5" />
            <circle cx="16" cy="16" r="8" strokeOpacity="0.35" />
            <path d="M16 16 L27 9" strokeOpacity="0.9" />
          </g>
          <circle cx="22" cy="20" r="2.2" fill="currentColor" />
          <circle cx="10" cy="11" r="2.2" fill="currentColor" />
        </svg>
        <span>
          <span className="block font-bold text-ink-primary">Transfer network</span>
          <span className="text-sm text-ink-muted">Every live rumour as a map of players and clubs</span>
        </span>
        <span aria-hidden className="ml-auto text-xl text-ink-muted transition-colors group-hover:text-pitch-500">→</span>
      </Link>

      {/* Filters */}
      <section aria-labelledby="filters-title">
        <SectionKicker as="h2" className="mb-3">
          <span id="filters-title">Filter rumours</span>
        </SectionKicker>
        <Suspense>
          <FilterBar />
        </Suspense>
      </section>

      {/* Live feed */}
      <LiveRumourFeed total={total} />

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
    </RumourFeedProvider>
  )
}
