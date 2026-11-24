'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { RumourHistoryPoint } from '@/types'
import { axisProps, tooltipStyle, chartColors, chartHeight } from '@/lib/chartTheme'

interface Props {
  history: RumourHistoryPoint[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function TimelineChart({ history }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-chart-timeline animate-pulse rounded-lg bg-surface-raised/60" />

  if (history.length < 2) {
    return <p className="text-sm text-ink-muted italic">Not enough data for timeline.</p>
  }

  const data = history.map((h) => ({
    date: formatDate(h.recordedAt),
    likelihood: Math.round(h.computedLikelihood),
  }))

  return (
    <ResponsiveContainer width="100%" height={chartHeight.timeline}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <XAxis
          dataKey="date"
          {...axisProps}
        />
        <YAxis
          domain={[0, 100]}
          {...axisProps}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          itemStyle={tooltipStyle.itemStyle}
          formatter={(v: number) => [`${v}%`, 'Likelihood']}
        />
        <ReferenceLine y={70} stroke={chartColors.hot} strokeDasharray="4 2" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="likelihood"
          stroke={chartColors.success}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: chartColors.success, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
