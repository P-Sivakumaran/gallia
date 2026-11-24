import type { ReactNode } from 'react'
import type { GalliaEvidence, SignalStatus } from '@/lib/gallia-types'

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    chart: <><path d="M3 3v18h18M7 15l4-5 4 3 6-8" /></>,
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10m0-4h5a7 7 0 0 0 7-5" /></>,
    settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    external: <><path d="M14 3h7v7m0-7L11 13M10 4H4v16h16v-6" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
    book: <><path d="M12 5v16M3 4h5l4 2 4-2h5v15h-5l-4 2-4-2H3Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.activity}</svg>
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  return <span className={`g-status g-status-${status.toLowerCase()}`}><span />{status === 'Hot' ? 'HOT' : status.toUpperCase()}</span>
}

export function DeltaChip({ value }: { value: number | null }) {
  return value === null ? <span className="g-muted">—</span> : <span className={`g-delta ${value < 0 ? 'negative' : ''}`}>{value < 0 ? '↘' : '↗'} {value > 0 ? '+' : ''}{value}%</span>
}

export function Sparkline({ values, negative = false, large = false }: { values: number[]; negative?: boolean; large?: boolean }) {
  if (values.length < 2) return <span className="g-muted">No history yet</span>
  const width = large ? 560 : 112
  const height = large ? 160 : 36
  const points = values.map((v, i) => `${i * width / (values.length - 1)},${height - 5 - v * (height - 10) / 100}`).join(' ')
  return <svg className={`g-sparkline ${large ? 'large' : ''} ${negative ? 'negative' : ''}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Probability trend from ${values[0]} to ${values.at(-1)} percent`}>
    {large && [0, 25, 50, 75, 100].map((n) => <line key={n} x1="0" x2={width} y1={height - 5 - n * (height - 10) / 100} y2={height - 5 - n * (height - 10) / 100} stroke="currentColor" opacity=".13" />)}
    {large && <polygon points={`0,${height} ${points} ${width},${height}`} fill="currentColor" opacity=".06" />}
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth={large ? 2 : 1.7} vectorEffect="non-scaling-stroke" />
    <circle cx={width} cy={height - 5 - values[values.length - 1] * (height - 10) / 100} r={large ? 3 : 2} fill="currentColor" />
  </svg>
}

export function ProbabilityMeter({ value, range }: { value: number | null; range?: [number, number] }) {
  const probability = value === null ? null : Math.min(100, Math.max(0, value))
  const point = (percentage: number, radius: number) => {
    const angle = Math.PI + percentage / 100 * Math.PI
    // Rounded so server and browser trig agree on the last digits (otherwise a hydration mismatch).
    const round = (n: number) => Math.round(n * 1000) / 1000
    return { x: round(120 + radius * Math.cos(angle)), y: round(122 + radius * Math.sin(angle)) }
  }

  return (
    <div className="g-meter" role="img" aria-label={probability === null ? 'Forecast pending' : `Transfer likelihood: ${probability}%`}>
      <svg viewBox="0 0 240 160" aria-hidden="true">
        {probability !== null && range && (
          <path className="g-meter-corridor" d="M24 122a96 96 0 0 1 192 0" pathLength="100" strokeDasharray={`${range[1] - range[0]} 100`} strokeDashoffset={-range[0]} />
        )}
        {Array.from({ length: 40 }, (_, index) => {
          const start = point(index * 2.5 + .4, 96)
          const end = point((index + 1) * 2.5 - .4, 96)
          return <path key={index} className={`g-meter-segment ${probability !== null && (index + .5) * 2.5 <= probability ? 'is-filled' : ''}`} d={`M${start.x} ${start.y}A96 96 0 0 1 ${end.x} ${end.y}`} />
        })}
        {Array.from({ length: 21 }, (_, index) => {
          const outer = point(index * 5, 81)
          const inner = point(index * 5, index % 5 === 0 ? 73 : 77)
          return <line key={index} x1={outer.x} x2={inner.x} y1={outer.y} y2={inner.y} className="g-meter-tick" />
        })}
      </svg>
      <div className="g-meter-value" aria-hidden="true">{probability ?? '—'}{probability !== null && <span>%</span>}<small>{probability === null ? 'FORECAST PENDING' : 'TRANSFER LIKELIHOOD'}</small></div>
      <div className="g-meter-scale" aria-hidden="true"><span>0%</span><span>100%</span></div>
    </div>
  )
}

export function EvidenceBalance({ evidence }: { evidence: GalliaEvidence[] }) {
  if (!evidence.length) return null
  const directions = [
    { direction: 'SUPPORTS', label: 'supports', className: 'supports' },
    { direction: 'CONTRADICTS', label: 'contradicts', className: 'contradicts' },
    { direction: 'CONTEXTUAL', label: 'contextual', className: 'contextual' },
  ].map((item) => ({
    ...item,
    count: evidence.filter((entry) => entry.direction === item.direction).length,
  }))

  return (
    <div className="g-evidence-balance" role="group" aria-label="Evidence direction breakdown">
      <div className="g-evidence-balance-track" aria-hidden="true">
        {directions.filter((item) => item.count > 0).map((item) => <span key={item.direction} className={item.className} style={{ flex: item.count }} />)}
      </div>
      <div className="g-evidence-balance-labels">
        {directions.map((item) => <span key={item.direction} className={item.className}><i aria-hidden="true" />{item.count} {item.label}</span>)}
      </div>
    </div>
  )
}
