import { Suspense } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import DeskPage, { Metric } from '@/components/desk/DeskPage'
import RumourLedger from '@/components/desk/RumourLedger'
import { Icon } from '@/components/gallia/Primitives'
import { RumourFeedProvider } from '@/components/live/RumourFeedProvider'
import type { RumourStatus, TransferWindow } from '@/types'

interface SearchParams {
  league?: string
  position?: string
  status?: string
  window?: string
  page?: string
}

export default async function RumoursPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1', 10)

  const [{ data: rumours, total, limit }, stats] = await Promise.all([
    api.rumours.list({
      league: sp.league,
      position: sp.position,
      status: sp.status as RumourStatus | undefined,
      window: sp.window as TransferWindow | undefined,
      page,
      limit: 20,
    }),
    api.stats.overview(),
  ])
  const totalPages = Math.ceil(total / limit)

  return (
    <DeskPage
      eyebrow="THE RUMOUR LEDGER"
      title="Every rumour, scored"
      accent="."
      intro={<>Each likelihood comes from who reported it and how many independent sources agree, then gets checked against what actually happened on the <Link href="/scorecard" className="g-green-link" style={{ display: 'inline' }}>scorecard</Link>.</>}
      actions={<Link href="/network" className="g-button"><Icon name="branch" size={16} />Transfer network</Link>}
    >
      <div className="g-metrics" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
        <Metric label="RUMOURS TRACKED" value={stats.totalRumours} note="All windows" />
        <Metric label="HOT NOW" value={stats.hotRumours} tone="amber" note="Open, 70%+ (model estimate)" />
        <Metric label="SIGNED" value={stats.completedRumours} tone="green" note="Confirmed moves" />
      </div>
      <RumourFeedProvider initialRumours={rumours}>
        <Suspense>
          <RumourLedger total={total} page={page} totalPages={totalPages} />
        </Suspense>
      </RumourFeedProvider>
    </DeskPage>
  )
}
