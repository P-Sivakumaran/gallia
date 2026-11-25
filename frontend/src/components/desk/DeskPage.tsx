import type { ReactNode } from 'react'
import '../gallia/gallia.css'
import './desk.css'

/**
 * Shell for every page outside the home desk, so Rumours, Network and Scorecard
 * share the desk's width, grid background, heading and panel vocabulary.
 */
export default function DeskPage({
  eyebrow,
  title,
  accent,
  intro,
  actions,
  children,
}: {
  eyebrow: string
  title: string
  /** Trailing part of the title, set in the desk green */
  accent?: string
  intro?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="g-app g-desk-page">
      <div className="g-workspace">
        <header className="g-page-heading">
          <div>
            <div className="g-eyebrow"><span className="g-kicker-rule" aria-hidden="true" />{eyebrow}</div>
            <h1>{title}{accent && <span>{accent}</span>}</h1>
            {intro && <p>{intro}</p>}
          </div>
          {actions && <div className="g-heading-actions">{actions}</div>}
        </header>
        {children}
      </div>
    </div>
  )
}

export function Metric({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'green' | 'amber' | 'red' }) {
  const color = tone === 'green' ? 'var(--signal-fire)' : tone === 'amber' ? 'var(--signal-hot)' : tone === 'red' ? 'var(--signal-denied)' : undefined
  return (
    <div className="g-metric">
      <div><span className="g-eyebrow">{label}</span></div>
      <div className="g-metric-bottom"><div><strong style={color ? { color } : undefined}>{value}</strong>{note && <p>{note}</p>}</div></div>
    </div>
  )
}

export function PanelHeading({ title, right }: { title: string; right?: ReactNode }) {
  return <div className="g-panel-heading"><h2>{title}</h2>{right}</div>
}
