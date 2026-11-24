'use client'

import Link from 'next/link'
import { clsx } from 'clsx'
import type { Rumour, RumourStatus } from '@/types'
import TruthMeter from '@/components/TruthMeter'
import StatusBadge from '@/components/StatusBadge'
import ReliabilityBar from '@/components/ReliabilityBar'
import SectionKicker from '@/components/SectionKicker'
import RadarField from './RadarField'
import { useFeed, pickFeatured, VERDICT } from './RumourFeedProvider'
import { feeLabel } from '@/lib/format'
import { resolveDisplayOrigin } from '@/lib/rumourOrigin'

/**
 * The home hero, built from the raea rumour-of-the-day and OG stills: a two-tone display line,
 * the LIVE ticker, the Rumour of the Day card and its meter over the radar. Everything reads
 * from the live feed, so the hero and the cards below never disagree.
 */

const STRIPE: Record<RumourStatus, string> = {
  HOT: 'bg-hot',
  PENDING: 'bg-pending',
  COMPLETED: 'bg-completed',
  FAILED: 'bg-failed',
  DENIED: 'bg-denied',
}
const EDGE: Record<RumourStatus, string> = {
  HOT: 'border-hot/50',
  PENDING: 'border-line',
  COMPLETED: 'border-completed/50',
  FAILED: 'border-failed/50',
  DENIED: 'border-denied-line',
}
const VERDICT_BAR: Record<RumourStatus, string> = {
  HOT: 'bg-hot text-field-deep',
  PENDING: 'bg-pending text-field-deep',
  COMPLETED: 'bg-completed text-field-deep',
  FAILED: 'bg-failed text-field-deep',
  DENIED: 'bg-denied text-ink-primary',
}

function tickerLine(r: Rumour): string {
  const origin = resolveDisplayOrigin(r)
  const from = origin.club.shortName ?? origin.club.name
  const to = r.toClub.shortName ?? r.toClub.name
  const reading =
    r.status === 'COMPLETED' || r.status === 'FAILED' || r.status === 'DENIED'
      ? r.status
      : `${Math.round(r.computedLikelihood)}%`
  return `${r.player.name} · ${from} → ${to} · ${reading}`
}

/** Broadcast strip (raea LiveTicker). It changes only when a real update arrives, never on a timer. */
function LiveTicker({ text, seq }: { text: string; seq: number }) {
  return (
    <div className="cue-ticker flex h-11 items-stretch overflow-hidden rounded-lg border border-pitch-500/25 bg-field-deep/90 intro:motion-safe:animate-rise">
      <div className="flex shrink-0 items-center gap-2 bg-pitch-600 px-3.5">
        <span aria-hidden className="h-2 w-2 rounded-full bg-ink-primary" />
        <span className="font-mono text-sm font-extrabold tracking-kicker text-ink-primary">LIVE</span>
      </div>
      <div className="relative flex min-w-0 flex-1 items-center overflow-hidden px-4">
        <p
          key={seq}
          className={clsx('truncate font-mono text-sm font-bold uppercase text-pitch-100', seq > 0 && 'motion-safe:animate-ticker-in')}
        >
          {text}
        </p>
      </div>
    </div>
  )
}

function FeaturedCard({ r }: { r: Rumour }) {
  const origin = resolveDisplayOrigin(r)
  return (
    <Link
      href={`/rumour/${r.id}`}
      className={clsx(
        'cue-card group relative block overflow-hidden rounded-2xl border-2 bg-card shadow-card transition duration-200 hover:-translate-y-0.5 intro:motion-safe:animate-rise',
        EDGE[r.status],
        'hover:border-pitch-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch-500',
      )}
    >
      <div aria-hidden className={clsx('h-1.5', STRIPE[r.status])} />
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <SectionKicker className="text-hot-fg">Rumour of the day</SectionKicker>
          <SectionKicker as="span">{r.window} window</SectionKicker>
        </div>

        <div className="cue-name mt-3 flex flex-wrap items-center gap-3 intro:motion-safe:animate-rise">
          <h2 className="text-4xl font-black tracking-display text-ink-primary sm:text-5xl">{r.player.name}</h2>
          <span className="rounded-md border border-line-strong px-2 py-0.5 font-mono text-sm font-bold text-ink-soft">
            {r.player.position}
          </span>
          <StatusBadge status={r.status} className="ml-auto text-sm" />
        </div>

        {/* Route box: FROM over the green arrow, as on the raea poster */}
        <div className="cue-route mt-5 grid grid-cols-route items-baseline gap-x-4 gap-y-1 rounded-xl border border-line/60 bg-surface-panel/60 px-5 py-4 intro:motion-safe:animate-fade-in">
          <SectionKicker as="span" className="text-ink-muted">From</SectionKicker>
          <span className="cue-from truncate text-xl font-bold tracking-display text-ink-soft sm:text-2xl intro:motion-safe:animate-rise">{origin.club.name}</span>
          <svg aria-hidden viewBox="0 0 32 16" className="h-4 w-8 self-center text-pitch-500">
            {/* pathLength=1 lets the arrow draw from tail to head with one keyframe */}
            <path
              d="M1 8h27M21 2l7 6-7 6"
              pathLength={1}
              strokeDasharray={1}
              className="cue-arrow intro:motion-safe:animate-draw-in"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="cue-to truncate text-2xl font-black tracking-display text-ink-primary sm:text-3xl intro:motion-safe:animate-rise">
            <span className="sr-only">to </span>
            {r.toClub.name}
          </span>
        </div>

        {/* Stat cells */}
        <dl className="mt-5 grid grid-cols-3 divide-x divide-line/60">
          <div className="cue-fee min-w-0 pr-3 sm:pr-4 intro:motion-safe:animate-rise">
            <SectionKicker as="dt">Fee</SectionKicker>
            <dd className="mt-1 whitespace-nowrap font-mono text-lg font-extrabold text-ink-primary sm:text-3xl">
              {feeLabel(r.reportedFeeMin, r.reportedFeeMax, r.currency)}
            </dd>
          </div>
          <div className="cue-sources min-w-0 px-3 sm:px-4 intro:motion-safe:animate-rise">
            <SectionKicker as="dt">Sources</SectionKicker>
            <dd className="mt-1 font-mono text-lg font-extrabold tabular-nums text-pitch-500 sm:text-3xl">{r.distinctSourceCount}</dd>
          </div>
          <div className="cue-reliability min-w-0 pl-3 sm:pl-4 intro:motion-safe:animate-rise">
            <SectionKicker as="dt">Reliability</SectionKicker>
            <dd className="mt-2.5">
              <ReliabilityBar score={r.source.reliabilityScore} size="lg" />
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  )
}

export default function HomeHero() {
  const { rumours, live, latest } = useFeed()
  const featured = pickFeatured(rumours)
  const tickerRumour = (latest && rumours.find((r) => r.id === latest.id)) ?? featured
  const featuredLive = featured ? live[featured.id] : undefined

  return (
    <section aria-labelledby="hero-title" className="grid grid-cols-1 items-center gap-10 lg:grid-cols-hero">
      <div className="min-w-0 space-y-6">
        <h1 id="hero-title" className="cue-headline text-4xl font-black leading-none tracking-display text-ink-primary sm:text-5xl 2xl:text-6xl intro:motion-safe:animate-rise">
          Every transfer rumour,
          <br />
          <span className="text-pitch-500">scored 0–100.</span>
        </h1>
        <p className="cue-lede max-w-xl text-lg text-ink-soft intro:motion-safe:animate-rise">
          Each likelihood comes from who reported it and how many independent sources agree, then gets checked against
          what actually happened on the{' '}
          <Link href="/scorecard" className="font-semibold text-pitch-500 underline-offset-4 hover:underline">
            public scorecard
          </Link>
          .
        </p>
        {tickerRumour && <LiveTicker text={tickerLine(tickerRumour)} seq={latest?.seq ?? 0} />}
        {featured && <FeaturedCard r={featured} />}
      </div>

      {featured && (
        <div className="flex flex-col items-center gap-6">
          {/* Square stage: the radar scales to the column (never wider than the phone), the meter sits on it */}
          <div className="relative grid aspect-square w-full max-w-md place-items-center">
            <div className="absolute inset-0">
              <RadarField size={420} sources={featured.distinctSourceCount} />
            </div>
            <div className="relative">
              <TruthMeter
                score={featured.computedLikelihood}
                status={featured.status}
                size="xl"
                pulseKey={featuredLive?.statusChanged ? featuredLive.seq : 0}
                rollKey={featuredLive?.seq ?? 0}
                intro="session"
              />
            </div>
          </div>
          {/* The verdict lands last on arrival, and slams again when a live update changes the status */}
          <p
            key={`${featured.status}-${featuredLive?.statusChanged ? featuredLive.seq : 0}`}
            className={clsx(
              'flex w-full max-w-sm items-center justify-center gap-3 rounded-xl px-6 py-3 text-2xl font-black uppercase tracking-display',
              VERDICT_BAR[featured.status],
              featuredLive?.statusChanged ? 'motion-safe:animate-slam' : 'cue-verdict intro:motion-safe:animate-slam',
            )}
          >
            <svg aria-hidden viewBox="0 0 18 16" className="h-5 w-5">
              <rect x="0" y="9" width="4" height="7" fill="currentColor" />
              <rect x="7" y="5" width="4" height="11" fill="currentColor" />
              <rect x="14" y="0" width="4" height="16" fill="currentColor" />
            </svg>
            {VERDICT[featured.status]}
          </p>
        </div>
      )}
    </section>
  )
}
