'use client'

import { useEffect, useState } from 'react'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

export interface RadialGaugeProps {
  value: number // 0–100
  label?: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { outer: 56, inner: 60, fontSize: 11 },
  md: { outer: 90, inner: 65, fontSize: 18 },
  lg: { outer: 130, inner: 70, fontSize: 26 },
}

// Genericized from TruthMeter.tsx — that version looked up color from a
// RumourStatus enum; this takes color directly so any 0-100 score can use it.
export function RadialGauge({ value, label, color, size = 'md' }: RadialGaugeProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { outer, inner, fontSize } = SIZES[size]
  const data = [{ value, fill: color }]

  // SSR placeholder — same dimensions, no chart, avoids hydration mismatch.
  if (!mounted) {
    return (
      <div className="relative flex flex-col items-center" style={{ width: outer, height: outer }}>
        <div className="absolute inset-0 rounded-full bg-slate-800" style={{ margin: 4 }} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ fontSize }}>
          <span className="font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
          {label && size !== 'sm' && (
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center">
      <RadialBarChart
        width={outer}
        height={outer}
        cx={outer / 2}
        cy={outer / 2}
        innerRadius={inner / 2}
        outerRadius={outer / 2 - 4}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: '#1e293b' }} dataKey="value" angleAxisId={0} cornerRadius={4} />
      </RadialBarChart>
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontSize }}
      >
        <span className="font-bold tabular-nums leading-none" style={{ color }}>{value}</span>
        {label && size !== 'sm' && (
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        )}
      </div>
    </div>
  )
}
