import { clsx } from 'clsx'
import type { CSSProperties } from 'react'
import type { RumourStatus } from '@/types'
import { meter, status as statusTokens, surface } from '@/lib/tokens'

/**
 * The Truth Meter: a precision instrument ported from the raea brand kit
 * (projects/rumour-hub-brand/components/TruthMeterMotion.tsx). The app's radial bar, a graduated scale,
 * a hard ink cursor on the arc's leading edge and faint radar rings in the well. Pure SVG, no chart library.
 *
 * Motion is CSS only, so the server-rendered markup is already the final reading:
 * - first paint: the track draws, then the arc sweeps up to the score
 * - a live score change eases to the new value
 * - a status change sends one ring out (pass a new `pulseKey`)
 */
interface Props {
  score: number // 0–100
  status: RumourStatus
  size?: 'sm' | 'md' | 'lg'
  /** Increment to send one ring out from the meter (a status change) */
  pulseKey?: number
  /** Play the power-on build and sweep on first paint */
  intro?: boolean
}

const STATUS_COLORS: Record<RumourStatus, string> = {
  HOT: statusTokens.hot.DEFAULT,
  PENDING: statusTokens.pending.DEFAULT,
  COMPLETED: statusTokens.completed.DEFAULT,
  FAILED: statusTokens.failed.DEFAULT,
  DENIED: statusTokens.denied.DEFAULT,
}

const STATUS_LABELS: Record<RumourStatus, string> = {
  HOT: 'HOT',
  PENDING: 'PENDING',
  COMPLETED: 'DONE',
  FAILED: 'FAILED',
  DENIED: 'DENIED',
}

/** px: outer diameter, ring thickness ratio, score text, whether to draw the scale and the label */
const SIZES = {
  sm: { size: 56, strokeRatio: 0.14, scoreSize: 15, ticks: false, label: false },
  md: { size: 112, strokeRatio: 0.09, scoreSize: 24, ticks: true, label: true },
  lg: { size: 168, strokeRatio: 0.1, scoreSize: 42, ticks: true, label: true },
} as const

export default function TruthMeter({ score, status, size = 'md', pulseKey = 0, intro = true }: Props) {
  const spec = SIZES[size]
  const d = spec.size
  const value = Math.max(0, Math.min(100, Math.round(score)))
  const color = STATUS_COLORS[status]

  const c0 = d / 2
  const strokeWidth = Math.max(6, Math.round(d * spec.strokeRatio))
  const tickBand = spec.ticks ? Math.max(8, Math.round(d * 0.07)) : 2
  const gap = Math.max(3, Math.round(d * 0.018))
  const radius = d / 2 - tickBand - gap - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const wellR = radius - strokeWidth / 2 - Math.max(2, d * 0.012)
  const thin = Math.max(1.25, d * 0.0075)

  const polar = (r: number, pct: number) => {
    const a = ((-90 + (pct / 100) * 360) * Math.PI) / 180
    return [c0 + r * Math.cos(a), c0 + r * Math.sin(a)] as const
  }

  // Graduated scale: a mark every 5 units, majors at 0/25/50/75.
  const ticks = spec.ticks
    ? Array.from({ length: 20 }, (_, i) => {
        const pct = i * 5
        const major = pct % 25 === 0
        const outer = d / 2 - 1
        const inner = outer - (major ? tickBand : tickBand * 0.5)
        const [x1, y1] = polar(inner, pct)
        const [x2, y2] = polar(outer, pct)
        return { pct, major, x1, y1, x2, y2, lit: value > 0 && pct <= value }
      })
    : []

  const vars = { '--meter-c': `${circumference}px` } as CSSProperties
  const scoreSize = value >= 100 ? Math.round(spec.scoreSize * 0.78) : spec.scoreSize
  const label = STATUS_LABELS[status]

  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value}% likely, ${label.toLowerCase()}`}
      aria-label="Completion likelihood"
      className="relative flex-shrink-0"
      style={{ width: d, height: d }}
    >
      {pulseKey > 0 && (
        <span
          key={pulseKey}
          aria-hidden
          data-testid="meter-pulse"
          className="pointer-events-none absolute inset-0 animate-meter-pulse rounded-full border-2"
          style={{ borderColor: color }}
        />
      )}
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="absolute inset-0 overflow-visible" aria-hidden style={vars}>
        {/* Instrument well with radar rings */}
        <circle cx={c0} cy={c0} r={wellR} fill={meter.well} />
        <g fill="none" stroke={color} strokeOpacity={0.12} strokeWidth={thin}>
          <circle cx={c0} cy={c0} r={wellR * 0.78} />
          <line x1={c0 - wellR} y1={c0} x2={c0 - wellR * 0.86} y2={c0} />
          <line x1={c0 + wellR * 0.86} y1={c0} x2={c0 + wellR} y2={c0} />
          <line x1={c0} y1={c0 - wellR} x2={c0} y2={c0 - wellR * 0.86} />
          <line x1={c0} y1={c0 + wellR * 0.86} x2={c0} y2={c0 + wellR} />
        </g>

        {/* Scale: unlit marks first, then the lit ones fade in as the arc arrives */}
        {ticks.map((t) => (
          <line
            key={t.pct}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={meter.tick}
            strokeOpacity={t.major ? 0.9 : 0.55}
            strokeWidth={t.major ? thin * 1.8 : thin}
          />
        ))}
        <g className={clsx(intro && 'motion-safe:animate-meter-fade')}>
          {ticks
            .filter((t) => t.lit)
            .map((t) => (
              <line
                key={t.pct}
                data-testid="meter-tick-lit"
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={color}
                strokeWidth={t.major ? thin * 1.8 : thin}
              />
            ))}
        </g>

        {/* Track draws clockwise from 12 o'clock */}
        <circle
          cx={c0}
          cy={c0}
          r={radius}
          fill="none"
          stroke={surface.raised}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          transform={`rotate(-90 ${c0} ${c0})`}
          className={clsx(intro && 'motion-safe:animate-meter-build')}
          style={{ strokeDashoffset: 0 }}
        />

        {/* Score arc: sweeps up on first paint, eases on a live change */}
        <circle
          cx={c0}
          cy={c0}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          transform={`rotate(-90 ${c0} ${c0})`}
          className={clsx('transition-meter duration-tween ease-tween', intro && 'motion-safe:animate-meter-sweep')}
          style={{ strokeDashoffset: circumference * (1 - value / 100), opacity: value > 0 ? 1 : 0 }}
        />

        {/* Leading-edge cursor: a hard radial line from the well to the scale */}
        {value > 0 && (
          <line
            x1={c0}
            y1={c0 - (radius - strokeWidth / 2 - gap * 0.5)}
            x2={c0}
            y2={1}
            stroke={meter.cursor}
            strokeWidth={Math.max(2, d * 0.014)}
            className={clsx('transition-transform duration-tween ease-tween', intro && 'motion-safe:animate-meter-cursor')}
            style={{ transform: `rotate(${value * 3.6}deg)`, transformOrigin: `${c0}px ${c0}px` }}
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-extrabold tabular-nums leading-none tracking-tight" style={{ color, fontSize: scoreSize }}>
          {value}
        </span>
        {spec.label && (
          <span
            className={clsx(
              'mt-1 text-label font-bold uppercase text-ink-secondary',
              // md's well is 66px: normal tracking keeps PENDING clear of the ring
              size === 'lg' ? 'tracking-wide' : 'tracking-normal',
            )}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
