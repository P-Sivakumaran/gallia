import { notFound } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import TimelineChart from '@/components/TimelineChart'
import DeskPage, { PanelHeading } from '@/components/desk/DeskPage'
import RumourEvidenceEmpty from '@/components/desk/RumourEvidenceEmpty'
import { Icon, ProbabilityMeter } from '@/components/gallia/Primitives'
import { feeLabel } from '@/lib/format'
import { resolveDisplayOrigin } from '@/lib/rumourOrigin'
import type { RumourStatus } from '@/types'

const STATUS_CLASS: Record<RumourStatus, string> = {
  HOT: 'g-status',
  PENDING: 'g-status g-status-smoke',
  COMPLETED: 'g-status g-status-confirmed',
  FAILED: 'g-status g-status-denied',
  DENIED: 'g-status g-status-denied',
}

function code(name: string): string {
  return name.replace(/^(FC|AFC|AC|CF)\s+/i, '').slice(0, 3).toUpperCase()
}

export default async function RumourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  const rumour = await api.rumours.get(id).catch(() => null)
  if (!rumour) notFound()

  const origin = resolveDisplayOrigin(rumour)
  const likelihood = Math.round(rumour.computedLikelihood)
  const settled = rumour.status === 'COMPLETED' || rumour.status === 'FAILED' || rumour.status === 'DENIED'
  const reliability = Math.round(rumour.source.reliabilityScore * 100)

  return (
    <DeskPage
      eyebrow={`RUMOUR · R-${rumour.id}`}
      title={rumour.player.name}
      intro={
        <>
          <Link href={`/club/${origin.club.id}`} className="g-green-link" style={{ display: 'inline' }}>
            {origin.club.name}
          </Link>
          {' to '}
          <Link href={`/club/${rumour.toClub.id}`} className="g-green-link" style={{ display: 'inline' }}>
            {rumour.toClub.name}
          </Link>
          {`, ${rumour.window.toLowerCase()} window. Reported by ${rumour.source.name}.`}
        </>
      }
      actions={<Link href="/rumours" className="g-button"><span style={{ display: 'flex', transform: 'scaleX(-1)' }}><Icon name="arrow" size={16} /></span>All rumours</Link>}
    >
      <div className="g-hero-grid">
        <section className="g-panel g-hero">
          <div className="g-hero-top">
            <span className="g-eyebrow"><Icon name="activity" size={14} />THE RUMOUR</span>
            <span className="g-claim-id">R-{rumour.id}</span>
          </div>
          <div className="g-hero-main">
            <div className="g-hero-story">
              <div className="g-hero-tags">
                <span className={STATUS_CLASS[rumour.status]}><span />{rumour.status}</span>
                {rumour.player.position && <span className="g-muted">{rumour.player.position}</span>}
              </div>
              <h2><Link href={`/player/${rumour.player.id}`}>{rumour.player.name}</Link></h2>
              {rumour.notes && <p className="g-hero-headline">“{rumour.notes}”</p>}
              <div className="g-transfer-route">
                <Link href={`/club/${origin.club.id}`} className="g-route-club">
                  <span className="g-club-code">{code(origin.club.name)}</span>
                  <span><small>{origin.unconfirmed ? 'ORIGIN (UNCONFIRMED)' : 'FROM'}</small><strong>{origin.club.name}</strong></span>
                </Link>
                <span className="g-route-arrow"><Icon name="arrow" /></span>
                <Link href={`/club/${rumour.toClub.id}`} className="g-route-club">
                  <span className="g-club-code destination">{code(rumour.toClub.name)}</span>
                  <span><small>DESTINATION</small><strong>{rumour.toClub.name}</strong></span>
                </Link>
              </div>
            </div>
            <div className="g-hero-forecast">
              <p className="g-forecast-caption">{settled ? 'OUTCOME RECORDED' : 'MODEL ESTIMATE · UNCALIBRATED'}</p>
              <ProbabilityMeter value={likelihood} />
            </div>
          </div>
          <div className="g-route-matrix">
            <div><span className="g-eyebrow">REPORTED FEE</span><strong>{feeLabel(rumour.reportedFeeMin, rumour.reportedFeeMax, rumour.currency)}</strong></div>
            <div><span className="g-eyebrow">WINDOW</span><strong>{rumour.window.charAt(0) + rumour.window.slice(1).toLowerCase()}</strong></div>
            <div><span className="g-eyebrow">SOURCES</span><strong>{rumour.distinctSourceCount}</strong></div>
            <div><span className="g-eyebrow">FIRST REPORTED</span><strong>{new Date(rumour.rumourDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
          </div>
        </section>

        <aside className="g-panel">
          <PanelHeading title="Source" right={<span className="g-count-label">{rumour.source.type.replace(/_/g, ' ')}</span>} />
          <div className="g-panel-body">
            <p style={{ fontSize: 16, color: 'var(--g-c-edf1f5)', fontWeight: 550 }}>{rumour.source.name}</p>
            <div className="g-row-prob" style={{ alignItems: 'flex-start', marginTop: 16 }}>
              <strong>{reliability}<small>%</small></strong>
              <span className="g-probability-track" style={{ width: '100%' }}><i style={{ width: `${reliability}%`, background: 'var(--g-green)' }} /></span>
            </div>
            <p style={{ marginTop: 12 }}>Reliability: how often this source&apos;s resolved rumours came true, blended with a starting estimate until it has a track record.</p>
          </div>
        </aside>
      </div>

      <div className="g-score-grid">
        <section className="g-panel g-span-8">
          <PanelHeading title="Likelihood over time" right={<span className="g-count-label">70% = HOT</span>} />
          <div className="g-panel-body"><TimelineChart history={rumour.history} /></div>
        </section>
        <section className="g-panel g-span-4">
          <PanelHeading title="Evidence" right={<span className="g-count-label">{rumour.evidence.length} ARTICLE{rumour.evidence.length === 1 ? '' : 'S'}</span>} />
          {rumour.evidence.length === 0 ? (
            <RumourEvidenceEmpty />
          ) : (
            <ul className="g-evidence-list">
              {rumour.evidence.map((e, i) => (
                <li key={i}>
                  <a href={e.link} target="_blank" rel="noopener noreferrer">{e.headline} <Icon name="external" size={12} /></a>
                  <span>{e.sourceName} · {new Date(e.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DeskPage>
  )
}
