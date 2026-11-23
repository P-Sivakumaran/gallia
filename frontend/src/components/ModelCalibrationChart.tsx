'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { ModelHealthDefinition } from '@/types'
import { axisTick, tooltipStyle, chartColors, chartHeight } from '@/lib/chartTheme'

interface Props {
  definition: ModelHealthDefinition | null
  isLoading?: boolean
  error?: string | null
}

interface BinRow {
  meanPredictedPct: number
  empiricalRatePct: number
  perfectPct: number // same value as meanPredictedPct: draws the y=x reference line
  n: number
}

// Marker radius scaled by bin sample size: an unlabeled n=3 point must not
// read the same as an n=800 point (see dataviz skill's reliability-diagram
// failure mode: invisible bucket counts).
function radiusForN(n: number, maxN: number): number {
  if (maxN <= 0) return 4
  const MIN_R = 4
  const MAX_R = 14
  return MIN_R + (MAX_R - MIN_R) * Math.sqrt(n / maxN)
}

interface CalibrationDotProps {
  cx?: number
  cy?: number
  payload: BinRow
  maxN: number
}

function CalibrationDot({ cx, cy, payload, maxN }: CalibrationDotProps) {
  const r = radiusForN(payload.n, maxN)
  return <circle cx={cx} cy={cy} r={r} fill={chartColors.success} fillOpacity={0.85} stroke={chartColors.plotBg} strokeWidth={1.5} />
}

export default function ModelCalibrationChart({ definition, isLoading = false, error = null }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-line-subtle bg-surface-panel/40 p-5" data-testid="calibration-loading">
        <div className="h-chart-calibration animate-pulse rounded-lg bg-surface-raised/60" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-line-subtle bg-surface-panel/40 p-5" data-testid="calibration-error">
        <p className="text-sm text-ink-muted">Couldn&apos;t load model calibration: {error}</p>
      </div>
    )
  }

  const model = definition?.currentModel ?? null
  const curve = model?.calibrationCurve ?? []
  const hasCurve = curve.some((b) => b.n > 0)

  if (!model || !hasCurve) {
    return (
      <div className="rounded-xl border border-line-subtle bg-surface-panel/40 p-5" data-testid="calibration-empty">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Model calibration</p>
        <p className="mt-2 text-sm text-ink-muted">
          No calibration curve yet: not enough resolved real outcomes exist to evaluate the model against.
        </p>
      </div>
    )
  }

  const data: BinRow[] = curve
    .filter((b) => b.n > 0)
    .map((b) => ({
      meanPredictedPct: Math.round(b.meanPredicted * 1000) / 10,
      empiricalRatePct: Math.round(b.empiricalRate * 1000) / 10,
      perfectPct: Math.round(b.meanPredicted * 1000) / 10,
      n: b.n,
    }))
    .sort((a, b) => a.meanPredictedPct - b.meanPredictedPct)

  const maxN = Math.max(...data.map((d) => d.n))
  const isSynthetic = model.trainingDataSource !== 'db'

  return (
    <div className="rounded-xl border border-line-subtle bg-surface-panel/40 p-5" data-testid="calibration-chart">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Model calibration</p>
        {isSynthetic && (
          <span
            className="rounded-full border border-caution/40 bg-caution/10 px-2 py-0.5 text-label font-semibold text-caution-fg"
            data-testid="calibration-synthetic-badge"
          >
            Synthetic training data (not a live calibration guarantee)
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-ink-muted">Brier score</p>
          <p className="mt-0.5 font-mono text-sm text-ink-primary">{model.brierScore != null ? model.brierScore.toFixed(3) : '—'}</p>
        </div>
        <div>
          <p className="text-ink-muted">Log loss</p>
          <p className="mt-0.5 font-mono text-sm text-ink-primary">{model.logLoss != null ? model.logLoss.toFixed(3) : '—'}</p>
        </div>
        <div>
          <p className="text-ink-muted">Test samples</p>
          <p className="mt-0.5 font-mono text-sm text-ink-primary">{model.nTestSamples}</p>
        </div>
      </div>

      {!mounted ? (
        <div className="mt-4 h-chart-calibration animate-pulse rounded-lg bg-surface-raised/60" />
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight.calibration} className="mt-4">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 16, left: -20 }}>
            <XAxis
              dataKey="meanPredictedPct"
              type="number"
              domain={[0, 100]}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Predicted probability (%)', position: 'insideBottom', offset: -2, fill: chartColors.axis, fontSize: axisTick.fontSize }}
            />
            <YAxis
              domain={[0, 100]}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Actual outcome rate (%)', angle: -90, position: 'insideLeft', fill: chartColors.axis, fontSize: axisTick.fontSize }}
            />
            <Tooltip
              contentStyle={tooltipStyle.contentStyle}
              labelStyle={tooltipStyle.labelStyle}
              formatter={(v: number, name: string, item: { payload: BinRow }) => {
                if (name === 'empiricalRatePct') return [`${v}% actual (n=${item.payload.n})`, 'Outcome rate']
                if (name === 'perfectPct') return [`${v}% predicted`, 'Predicted']
                return [v, name]
              }}
            />
            <Line
              type="linear"
              dataKey="perfectPct"
              stroke={chartColors.grid}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              legendType="none"
              isAnimationActive={false}
            />
            <Scatter
              dataKey="empiricalRatePct"
              shape={(props: { cx?: number; cy?: number; payload: BinRow }) => (
                <CalibrationDot {...props} maxN={maxN} />
              )}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <p className="mt-1 text-label text-ink-faint">
        Dashed line = perfect calibration. Dot size = bin sample count.
      </p>
    </div>
  )
}
