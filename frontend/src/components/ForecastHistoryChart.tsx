'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot,
} from 'recharts'
import { axisProps, tooltipStyle, chartColors, chartHeight } from '@/lib/chartTheme'
import type { ClaimDetail, ForecastHistoryPoint, EntitlementDenial } from '@/types'
import { CheckCircleIcon, XCircleIcon } from './icons'
import SectionKicker from './SectionKicker'

interface Props {
  history: ForecastHistoryPoint[] | null
  claim?: ClaimDetail | null
  isLoading?: boolean
  error?: string | null
  entitlementDenied?: EntitlementDenial | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface ChartRow {
  timestamp: number
  date: string
  probability: number | null
  low: number | null
  high: number | null
}

export default function ForecastHistoryChart({
  history,
  claim,
  isLoading = false,
  error = null,
  entitlementDenied = null,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="history-loading">
        <div className="h-chart-history animate-pulse rounded-lg bg-surface-raised/60" />
      </div>
    )
  }

  // Forecast history is public; a denial now only means the feature flag is switched off,
  // so the section is left out rather than shown as an upsell.
  if (entitlementDenied) return null

  if (error) {
    return (
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="history-error">
        <p className="text-sm text-ink-muted">Couldn&apos;t load forecast history: {error}</p>
        <p className="mt-3">
          <Link
            href="/rumours"
            className="text-sm font-medium text-pitch-500 hover:underline"
            data-testid="history-error-rumours-cta"
          >
            Browse rumours →
          </Link>
        </p>
      </div>
    )
  }

  const precise = (history ?? []).filter((h) => h.calibratedProbability != null)

  if (!history || precise.length === 0) {
    return (
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="history-empty">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Forecast history</p>
        <p className="mt-2 text-sm text-ink-muted">
          This claim doesn&apos;t have any historical forecasts yet — a calibrated probability hasn&apos;t been
          computed for it.
        </p>
        <p className="mt-3">
          <Link
            href="/rumours"
            className="text-sm font-medium text-pitch-500 hover:underline"
            data-testid="history-empty-rumours-cta"
          >
            Browse rumours →
          </Link>
        </p>
      </div>
    )
  }

  const data: ChartRow[] = precise.map((h) => ({
    timestamp: new Date(h.predictionTimestamp).getTime(),
    date: formatDate(h.predictionTimestamp),
    probability: Math.round((h.calibratedProbability ?? 0) * 100),
    low: h.uncertaintyLow != null ? Math.round(h.uncertaintyLow * 100) : null,
    high: h.uncertaintyHigh != null ? Math.round(h.uncertaintyHigh * 100) : null,
  }))
  const hasBand = data.some((d) => d.low != null && d.high != null)

  const confirmationTs = claim?.officialConfirmation ? new Date(claim.officialConfirmation.publishedAt).getTime() : null
  const denialTs = claim?.officialDenial ? new Date(claim.officialDenial.publishedAt).getTime() : null

  const confirmationRow = confirmationTs != null ? nearestRow(data, confirmationTs) : null
  const denialRow = denialTs != null ? nearestRow(data, denialTs) : null

  return (
    <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="forecast-history-chart">
      <SectionKicker>Forecast history</SectionKicker>

      {!mounted ? (
        <div className="h-chart-history animate-pulse rounded-lg bg-surface-raised/60" />
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight.history}>
          <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" {...axisProps} />
            <YAxis domain={[0, 100]} {...axisProps} />
            <Tooltip
              contentStyle={tooltipStyle.contentStyle}
              labelStyle={tooltipStyle.labelStyle}
              formatter={(v: number, name: string) => [`${v}%`, name === 'probability' ? 'Probability' : name]}
            />
            {hasBand && (
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill={chartColors.success}
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            )}
            {hasBand && (
              <Area
                type="monotone"
                dataKey="low"
                stroke="none"
                fill={chartColors.plotBg}
                fillOpacity={1}
                isAnimationActive={false}
              />
            )}
            <Line type="monotone" dataKey="probability" stroke={chartColors.success} strokeWidth={2} dot={{ r: 3 }} />
            {confirmationRow && (
              <ReferenceDot
                x={confirmationRow.date}
                y={confirmationRow.probability ?? 0}
                r={6}
                fill={chartColors.success}
                stroke={chartColors.plotBg}
                strokeWidth={2}
              />
            )}
            {denialRow && (
              <ReferenceDot
                x={denialRow.date}
                y={denialRow.probability ?? 0}
                r={6}
                fill={chartColors.danger}
                stroke={chartColors.plotBg}
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {(confirmationRow || denialRow) && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
          {confirmationRow && (
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5 text-pitch-500" /> Official confirmation
            </span>
          )}
          {denialRow && (
            <span className="flex items-center gap-1.5">
              <XCircleIcon className="h-3.5 w-3.5 text-failed-fg" /> Official denial
            </span>
          )}
        </div>
      )}
      {hasBand && <p className="mt-1 text-label text-ink-faint">Shaded band = uncertainty range</p>}
    </div>
  )
}

function nearestRow(data: ChartRow[], targetTs: number): ChartRow | null {
  if (data.length === 0) return null
  return data.reduce((closest, row) =>
    Math.abs(row.timestamp - targetTs) < Math.abs(closest.timestamp - targetTs) ? row : closest,
  )
}
