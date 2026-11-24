import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import TruthMeter from '@/components/TruthMeter'
import TimelineChart from '@/components/TimelineChart'
import SectionKicker from '@/components/SectionKicker'
import { resolveDisplayOrigin } from '@/lib/rumourOrigin'

export default async function RumourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const rumour = await api.rumours.get(id).catch(() => null)
  if (!rumour) notFound()

  const origin = resolveDisplayOrigin(rumour)

  const fee =
    rumour.reportedFeeMin != null && rumour.reportedFeeMax != null
      ? `€${rumour.reportedFeeMin}–${rumour.reportedFeeMax}M`
      : rumour.reportedFeeMin != null
        ? `€${rumour.reportedFeeMin}M`
        : 'Undisclosed'

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-8">
        <TruthMeter
          score={Math.round(rumour.computedLikelihood)}
          status={rumour.status}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="text-4xl font-black tracking-display sm:text-5xl">
            <Link href={`/player/${rumour.player.id}`} className="hover:text-pitch-500">
              {rumour.player.name}
            </Link>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-lg">
            <Link href={`/club/${origin.club.id}`} className="font-medium text-ink-soft hover:text-ink-primary">
              {origin.club.name}
            </Link>
            {origin.unconfirmed && (
              <span
                className="rounded-full border border-caution/40 bg-caution/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-caution-fg"
                title="Origin club couldn't be confirmed from the source text — showing the player's actual current club instead"
              >
                unconfirmed origin
              </span>
            )}
            <span className="text-2xl text-ink-faint">→</span>
            <Link href={`/club/${rumour.toClub.id}`} className="font-medium text-ink-soft hover:text-ink-primary">
              {rumour.toClub.name}
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-secondary">
            <span>Fee: <strong className="text-ink-primary font-mono">{fee}</strong></span>
            <span>Window: <strong className="text-ink-primary">{rumour.window}</strong></span>
            <span>Position: <strong className="text-ink-primary">{rumour.player.position}</strong></span>
          </div>
        </div>
      </div>

      {/* Source */}
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-2">Source</p>
        <div className="flex items-center gap-3">
          <span className="font-medium text-ink-primary">{rumour.source.name}</span>
          <span className="text-xs text-ink-muted">{rumour.source.type.replace('_', ' ')}</span>
          <span className="ml-auto font-mono text-sm text-pitch-500">
            {Math.round(rumour.source.reliabilityScore * 100)}% reliable
          </span>
        </div>
      </div>

      {/* Likelihood timeline */}
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-4">
        <SectionKicker className="mb-4">
          Likelihood over time
        </SectionKicker>
        <TimelineChart history={rumour.history} />
      </div>

      {rumour.notes && (
        <div className="rounded-xl border border-line/60 bg-card shadow-card p-4">
          <SectionKicker className="mb-2">Notes</SectionKicker>
          <p className="text-ink-soft text-sm leading-relaxed">{rumour.notes}</p>
        </div>
      )}

      {/* Evidence — the articles this rumour and its status are actually based on */}
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-4">
        <SectionKicker className="mb-2">Evidence</SectionKicker>
        {rumour.evidence.length === 0 ? (
          <p className="text-sm text-ink-muted">No source articles linked to this rumour yet.</p>
        ) : (
          <ul className="space-y-2">
            {rumour.evidence.map((e, i) => (
              <li key={i} className="text-sm">
                <a
                  href={e.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pitch-500 hover:underline"
                >
                  {e.headline}
                </a>
                <span className="ml-2 text-xs text-ink-muted">
                  {e.sourceName} · {new Date(e.publishedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
