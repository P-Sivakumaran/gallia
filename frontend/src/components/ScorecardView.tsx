import Link from 'next/link'
import ModelCalibrationChart from '@/components/ModelCalibrationChart'
import type { ModelHealthDefinition, ModelHealthResponse } from '@/types'
import MeterScale from './MeterScale'

interface Props {
  health: ModelHealthResponse | null
  error?: string | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-ink-primary">{value}</p>
    </div>
  )
}

// What the user can actually conclude from this model's numbers. Synthetic
// or under-sampled results must never read as a live accuracy claim.
function verdict(def: ModelHealthDefinition): { tone: 'ok' | 'warn' | 'none'; text: string } {
  const m = def.currentModel
  if (!m) return { tone: 'none', text: 'No model has been trained for this horizon yet.' }
  if (m.trainingDataSource !== 'db') {
    return {
      tone: 'warn',
      text: 'Trained on synthetic data. These numbers check the pipeline works — they are not evidence of real-world accuracy.',
    }
  }
  if (!m.meetsMinSampleSize) {
    return {
      tone: 'warn',
      text: `Only ${m.nTestSamples} resolved rumours to test against (we want at least ${m.minSampleSizeForPrecise}). Treat these numbers as early and noisy.`,
    }
  }
  return {
    tone: 'ok',
    text: `Tested against ${m.nTestSamples} rumours whose outcome is now known.`,
  }
}

const TONE_CLASS = {
  ok: 'border-pitch-500/40 bg-pitch-500/10 text-pitch-100',
  warn: 'border-caution/40 bg-caution/10 text-caution-soft',
  none: 'border-line bg-surface-panel/40 text-ink-secondary',
} as const

function DefinitionSection({ def }: { def: ModelHealthDefinition }) {
  const m = def.currentModel
  const v = verdict(def)
  return (
    <section className="space-y-4" data-testid="scorecard-definition">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Will the transfer complete within {def.horizonDays} days?
        </h2>
        {m && <p className="font-mono text-xs text-ink-muted">model {m.version}</p>}
      </div>

      <p className={`rounded-lg border px-3 py-2 text-sm ${TONE_CLASS[v.tone]}`} data-testid="scorecard-verdict">
        {v.text}
      </p>

      {m && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-line/60 bg-card shadow-card p-5 sm:grid-cols-4">
          <Stat label="Trained" value={formatDate(m.trainedAt)} />
          <Stat label="Training rumours" value={String(m.nTrainSamples)} />
          <Stat label="Test rumours" value={String(m.nTestSamples)} />
          <Stat label="Data" value={m.trainingDataSource === 'db' ? 'Real outcomes' : 'Synthetic'} />
        </div>
      )}

      <ModelCalibrationChart definition={def} />
    </section>
  )
}

export default function ScorecardView({ health, error = null }: Props) {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-3">
        <p className="font-mono text-xs font-bold uppercase tracking-kicker text-pitch-500">Scorecard</p>
        <h1 className="text-4xl font-black tracking-display sm:text-5xl">How often are we right?</h1>
        <p className="text-lg text-ink-soft">
          Every rumour here gets a likelihood. This page checks those likelihoods against what actually
          happens as transfers resolve. If we say 70%, roughly 7 in 10 of those transfers should go through.
          Until enough real outcomes are in, we say so plainly — the numbers below show exactly where things
          stand, misses included.
        </p>
      </header>

      <MeterScale />

      <section className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-line/60 bg-card shadow-card p-4">
          <p className="font-semibold text-ink-primary">Brier score</p>
          <p className="mt-1 text-ink-secondary">
            Average squared gap between our forecast and the outcome. 0 is perfect; always guessing 50% scores 0.25.
            Lower is better.
          </p>
        </div>
        <div className="rounded-xl border border-line/60 bg-card shadow-card p-4">
          <p className="font-semibold text-ink-primary">Calibration chart</p>
          <p className="mt-1 text-ink-secondary">
            Dots on the dashed line mean our percentages match reality. Dots below it mean we were too confident.
          </p>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-line-subtle bg-surface-panel/40 p-4 text-sm text-ink-secondary" data-testid="scorecard-error">
          The scorecard is unavailable right now ({error}). Forecasts are still shown on each rumour.
        </p>
      ) : !health || health.definitions.length === 0 ? (
        <p className="rounded-lg border border-line-subtle bg-surface-panel/40 p-4 text-sm text-ink-secondary" data-testid="scorecard-empty">
          No forecasting model is active yet, so there is nothing to score.
        </p>
      ) : (
        health.definitions.map((def) => <DefinitionSection key={def.id} def={def} />)
      )}

      <footer className="border-t border-line-subtle pt-6 text-sm text-ink-muted">
        Official denials and contradicting evidence are always free to see on every rumour.{' '}
        <Link href="/pricing" className="text-ink-soft underline-offset-2 hover:underline">
          What&apos;s free and what&apos;s paid
        </Link>
      </footer>
    </div>
  )
}
