'use client'

import type { ForecastDisplayData } from '@/types'
import { CheckCircleIcon, AlertTriangleIcon, HelpCircleIcon, XCircleIcon } from './icons'
import SectionKicker from './SectionKicker'
import { clsx } from 'clsx'

interface Props {
  forecast: ForecastDisplayData | null
  isLoading?: boolean
  error?: string | null
}

function formatAsOf(iso?: string): string {
  if (!iso) return 'unknown time'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

const DISCLAIMER = 'Forecast, not confirmation.'

function CardShell({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-line/60 bg-card shadow-card p-5"
    >
      {children}
    </div>
  )
}

export default function ForecastCard({ forecast, isLoading = false, error = null }: Props) {
  if (isLoading) {
    return (
      <CardShell testId="forecast-card-loading">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-32 rounded bg-surface-raised" />
          <div className="h-10 w-24 rounded bg-surface-raised" />
          <div className="h-3 w-48 rounded bg-surface-raised" />
        </div>
      </CardShell>
    )
  }

  if (error) {
    return (
      <CardShell testId="forecast-card-error">
        <div className="flex items-start gap-3">
          <XCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-ink-muted" />
          <div>
            <p className="text-sm font-semibold text-ink-soft">Forecast unavailable</p>
            <p className="mt-1 text-xs text-ink-muted">{error}</p>
          </div>
        </div>
      </CardShell>
    )
  }

  if (!forecast || forecast.displayMode === 'INSUFFICIENT_DATA') {
    return (
      <CardShell testId="forecast-card-insufficient">
        <div className="flex items-start gap-3">
          <HelpCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-ink-muted" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-soft">
              Insufficient historical data
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {forecast?.insufficientDataReason ??
                'Not enough resolved outcomes exist yet to show a calibrated probability.'}
            </p>
            <p className="mt-3 text-label text-ink-muted">
              {DISCLAIMER}
            </p>
          </div>
        </div>
      </CardShell>
    )
  }

  const isInterval = forecast.displayMode === 'INTERVAL'
  const low = forecast.uncertaintyLow
  const high = forecast.uncertaintyHigh
  const point = forecast.calibratedProbability

  return (
    <CardShell testId={isInterval ? 'forecast-card-interval' : 'forecast-card-precise'}>
      <div className="flex items-start gap-3">
        {isInterval ? (
          <AlertTriangleIcon className="mt-1 h-6 w-6 flex-shrink-0 text-caution-fg" />
        ) : (
          <CheckCircleIcon className="mt-1 h-6 w-6 flex-shrink-0 text-pitch-500" />
        )}
        <div className="min-w-0 flex-1">
          <SectionKicker>
            {isInterval ? 'Wide-uncertainty forecast' : 'Completion likelihood'}
          </SectionKicker>

          {isInterval ? (
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink-primary">
              {low != null && high != null ? `${pct(low)}–${pct(high)}` : '—'}
            </p>
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <span className={clsx('text-4xl font-bold tabular-nums', 'text-pitch-500')}>
                {point != null ? pct(point) : '—'}
              </span>
              {low != null && high != null && (
                <span className="text-sm text-ink-muted">
                  ({pct(low)}–{pct(high)} band)
                </span>
              )}
            </div>
          )}

          <p className="mt-1 text-xs text-ink-muted">
            {isInterval
              ? 'The uncertainty band is too wide to show a single number responsibly.'
              : 'Chance of an official club confirmation within the forecast window.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-faint">
            <span>As of {formatAsOf(forecast.predictionTimestamp)}</span>
            {forecast.modelVersion && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{forecast.modelVersion}</span>
              </>
            )}
          </div>

          <p className="mt-3 text-label text-ink-muted">
            {DISCLAIMER}
          </p>
        </div>
      </div>
    </CardShell>
  )
}
