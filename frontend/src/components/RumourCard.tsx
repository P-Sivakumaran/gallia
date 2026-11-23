'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Rumour } from '@/types'
import TruthMeter from './TruthMeter'
import { resolveDisplayOrigin } from '@/lib/rumourOrigin'
import { clsx } from 'clsx'

interface Props {
  rumour: Rumour
  compact?: boolean
}

const STATUS_BADGE: Record<string, string> = {
  HOT: 'bg-hot/20 text-hot-fg border-hot/40',
  PENDING: 'bg-surface-overlay/40 text-ink-secondary border-line-strong/40',
  COMPLETED: 'bg-completed/20 text-completed-fg border-completed/40',
  FAILED: 'bg-failed/20 text-failed-fg border-failed/40',
  DENIED: 'bg-denied-deep/40 text-denied-fg border-denied-line/40',
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  JOURNALIST: 'bg-kind-journalist/20 text-kind-journalist-fg',
  NEWS_OUTLET: 'bg-kind-outlet/20 text-kind-outlet-fg',
  CLUB_OFFICIAL: 'bg-kind-official/20 text-kind-official-fg',
  AGENT: 'bg-kind-agent/20 text-kind-agent-fg',
  SOCIAL_MEDIA: 'bg-kind-social/20 text-kind-social-fg',
  AGGREGATOR: 'bg-kind-aggregator/20 text-kind-aggregator-fg',
}

function ReliabilityDots({ score }: { score: number }) {
  const filled = Math.round(score * 5)
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={clsx('h-1.5 w-1.5 rounded-full', i < filled ? 'bg-credibility' : 'bg-surface-subtle')}
        />
      ))}
    </span>
  )
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' }

function feeLabel(min: number | null, max: number | null, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  if (min == null && max == null) return 'Undisclosed'
  if (min != null && max != null) return `${symbol}${min}–${max}M`
  return `${symbol}${min ?? max}M`
}

export default function RumourCard({ rumour, compact = false }: Props) {
  const router = useRouter()
  const origin = resolveDisplayOrigin(rumour)

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/rumour/${rumour.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/rumour/${rumour.id}`)
      }}
      className={clsx(
        'group relative flex cursor-pointer gap-4 rounded-xl border border-line/60 bg-surface-raised/60 p-4 backdrop-blur-sm',
        'transition-all duration-200 hover:border-line-emphasis hover:bg-surface-raised hover:shadow-lg hover:shadow-black/30',
        compact ? 'items-center' : 'flex-col sm:flex-row sm:items-start',
      )}
    >
      {/* Truth meter */}
      <div className="flex-shrink-0">
        <TruthMeter score={Math.round(rumour.computedLikelihood)} status={rumour.status} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Player + transfer arrow */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/player/${rumour.player.id}`}
            className="text-base font-semibold text-ink-primary hover:text-pitch-500"
            onClick={(e) => e.stopPropagation()}
          >
            {rumour.player.name}
          </Link>
          <span className="rounded-full border px-2 py-0.5 text-xs font-mono font-medium text-ink-soft border-line-strong">
            {rumour.player.position}
          </span>
          <span
            className={clsx(
              'rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
              STATUS_BADGE[rumour.status],
            )}
          >
            {rumour.status}
          </span>
        </div>

        {/* Club transfer row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
          <Link
            href={`/club/${origin.club.id}`}
            className="font-medium text-ink-soft hover:text-ink-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {origin.club.shortName ?? origin.club.name}
          </Link>
          {origin.unconfirmed && (
            <span
              className="rounded-full border border-caution/40 bg-caution/10 px-1.5 py-0.5 text-label font-medium uppercase tracking-wide text-caution-fg"
              title="Origin club couldn't be confirmed from the source text — showing the player's actual current club instead"
            >
              unconfirmed origin
            </span>
          )}
          <span className="text-ink-muted">→</span>
          <Link
            href={`/club/${rumour.toClub.id}`}
            className="font-medium text-ink-soft hover:text-ink-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {rumour.toClub.shortName ?? rumour.toClub.name}
          </Link>
          <span className="ml-1 font-mono text-ink-secondary">
            {feeLabel(rumour.reportedFeeMin, rumour.reportedFeeMax, rumour.currency)}
          </span>
          <span className="text-ink-faint">·</span>
          <span className="text-ink-muted">{rumour.window}</span>
        </div>

        {/* Source chip + reliability */}
        {!compact && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                SOURCE_TYPE_COLORS[rumour.source.type] ?? 'bg-surface-subtle/40 text-ink-soft',
              )}
            >
              {rumour.source.name}
            </span>
            <ReliabilityDots score={rumour.source.reliabilityScore} />
            {rumour.distinctSourceCount > 1 && (
              <span className="text-xs text-ink-muted">+{rumour.distinctSourceCount - 1} more source{rumour.distinctSourceCount > 2 ? 's' : ''}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
