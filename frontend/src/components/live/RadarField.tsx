/**
 * Tactical radar from the raea brand kit (PitchBackground.tsx RadarField): range rings, a crosshair,
 * a scale and a stepped sweep trail (discrete slices, no blur). It sweeps once on first paint and
 * holds: it never loops (WCAG 2.2.2). One blip per distinct source behind the rumour.
 */
const SLICES = 14
const SLICE_DEG = 2.6

export default function RadarField({ size, sources, heading = 238 }: { size: number; sources: number; heading?: number }) {
  const c = size / 2
  const r = size / 2 - 18
  const pt = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180
    return [c + rad * Math.cos(a), c + rad * Math.sin(a)] as const
  }
  // Spread blips around the dial deterministically: golden-angle steps, alternating ranges.
  const blips = Array.from({ length: Math.min(sources, 12) }, (_, i) => ({
    angle: (i * 137.5 + 20) % 360,
    dist: i % 2 ? 0.88 : 0.74,
  }))

  return (
    <svg viewBox={`0 0 ${size} ${size}`} aria-hidden className="h-full w-full text-pitch-500">
      <g className="origin-center motion-safe:animate-radar-sweep">
        {Array.from({ length: SLICES }, (_, i) => {
          const [x0, y0] = pt(heading - (i + 1) * SLICE_DEG, r)
          const [x1, y1] = pt(heading - i * SLICE_DEG, r)
          return (
            <path
              key={i}
              d={`M ${c} ${c} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
              fill="currentColor"
              fillOpacity={0.085 * (1 - i / SLICES)}
            />
          )
        })}
        {(() => {
          const [x, y] = pt(heading, r)
          return <line x1={c} y1={c} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} />
        })()}
      </g>
      <g fill="none" stroke="currentColor">
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <circle key={k} cx={c} cy={c} r={r * k} strokeOpacity={k === 1 ? 0.26 : 0.12} strokeWidth={k === 1 ? 1.5 : 1} />
        ))}
        <line x1={c - r} y1={c} x2={c + r} y2={c} strokeOpacity={0.09} />
        <line x1={c} y1={c - r} x2={c} y2={c + r} strokeOpacity={0.09} />
        {Array.from({ length: 72 }, (_, i) => {
          const major = i % 6 === 0
          const [x0, y0] = pt(i * 5, r)
          const [x1, y1] = pt(i * 5, r + (major ? 12 : 6))
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeOpacity={major ? 0.36 : 0.18} strokeWidth={major ? 1.5 : 1} />
        })}
      </g>
      {blips.map((b, i) => {
        const [x, y] = pt(b.angle, r * b.dist)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={5} fill="currentColor" />
            <circle cx={x} cy={y} r={11} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} />
          </g>
        )
      })}
    </svg>
  )
}
