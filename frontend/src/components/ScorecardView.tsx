import Link from 'next/link'
import ModelCalibrationChart from '@/components/ModelCalibrationChart'
import DeskPage, { Metric, PanelHeading } from '@/components/desk/DeskPage'
import type { GalliaWorkspace } from '@/lib/gallia-types'
import type { ModelHealthDefinition, ModelHealthResponse } from '@/types'

interface Props {
  health: ModelHealthResponse | null
  error?: string | null
  /** The desk's ledger of resolved calls (GET /gallia/workspace), when connected */
  ledger?: GalliaWorkspace['ledger'] | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
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
  return { tone: 'ok', text: `Tested against ${m.nTestSamples} rumours whose outcome is now known.` }
}

const SCALE = [
  { at: 15, status: 'g-status g-status-denied', label: 'FAILED', name: 'Deal off', note: 'Settled: the move did not happen.' },
  { at: 45, status: 'g-status g-status-smoke', label: 'PENDING', name: 'Early talks', note: 'Open, under 70%.' },
  { at: 78, status: 'g-status', label: 'HOT', name: 'Heating up', note: 'Open, 70% or more.' },
  { at: 96, status: 'g-status g-status-confirmed', label: 'COMPLETED', name: 'Signed', note: 'Settled: the move happened.' },
]

function MeterGuide() {
  return (
    <section className="g-panel g-span-12">
      <PanelHeading title="How to read a likelihood" right={<span className="g-count-label">0–100</span>} />
      <div className="g-scale-track" aria-hidden="true">
        {SCALE.map((s) => <i key={s.at} style={{ left: `${s.at}%` }} />)}
        {[0, 25, 50, 75, 100].map((n) => <span key={n} style={{ left: `${n}%` }}>{n}</span>)}
      </div>
      <div className="g-scale-legend">
        {SCALE.map((s) => (
          <div key={s.label}>
            <span className={s.status} style={{ justifySelf: 'start' }}><span />{s.label}</span>
            <strong>{s.name}</strong>
            <span className="g-muted">{s.note}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Completion rate per likelihood band, from the scored ledger rows. */
function bands(rows: NonNullable<Props['ledger']>['rows']) {
  const edges = [0, 20, 40, 60, 80, 101]
  return edges.slice(0, -1).map((lo, i) => {
    const hi = edges[i + 1]
    const inBand = rows.filter((r) => r.scored >= lo && r.scored < hi)
    const done = inBand.filter((r) => r.outcome === 'Completed').length
    return { label: `${lo}–${Math.min(hi, 100)}%`, n: inBand.length, rate: inBand.length ? Math.round((done / inBand.length) * 100) : null }
  })
}

function LedgerSection({ ledger }: { ledger: NonNullable<Props['ledger']> }) {
  const completed = ledger.rows.filter((r) => r.outcome === 'Completed').length
  return (
    <>
      <div className="g-metrics" data-testid="scorecard-ledger">
        <Metric label="BRIER SCORE" value={ledger.brierScore != null ? ledger.brierScore.toFixed(3) : '—'} note="Heuristic model · lower is better" tone="green" />
        <Metric label="CALLS SCORED" value={ledger.scored} note={ledger.excluded ? `${ledger.excluded} left out: no pre-outcome estimate` : 'Every resolved call'} />
        <Metric label="COMPLETED / FAILED" value={`${completed} / ${ledger.rows.length - completed}`} note="Outcomes in the ledger" />
        <Metric label="COIN-FLIP BASELINE" value="0.250" note="Always saying 50%" />
      </div>
      <div className="g-score-grid">
        <section className="g-panel g-span-8">
          <PanelHeading title="Resolved calls" right={<span className="g-count-label">{Math.min(12, ledger.rows.length)} OF {ledger.rows.length}</span>} />
          <table className="g-ledger-mini">
            <thead><tr><th>CALL</th><th className="num">ESTIMATE</th><th>OUTCOME</th><th className="num">BRIER</th></tr></thead>
            <tbody>
              {ledger.rows.slice(0, 12).map((r) => (
                <tr key={r.id}>
                  <td><strong style={{ fontWeight: 550 }}>{r.player}</strong><div className="g-muted">{r.route} · {r.window}</div></td>
                  <td className="num">{r.scored}%</td>
                  <td><span className={`g-status ${r.outcome === 'Completed' ? 'g-status-confirmed' : 'g-status-denied'}`}><span />{r.outcome.toUpperCase()}</span></td>
                  <td className="num">{r.brier.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="g-panel g-span-4">
          <PanelHeading title="Hit rate by likelihood" />
          <table className="g-ledger-mini">
            <thead><tr><th>BAND</th><th className="num">CALLS</th><th className="num">SIGNED</th></tr></thead>
            <tbody>
              {bands(ledger.rows).map((b) => (
                <tr key={b.label}><td>{b.label}</td><td className="num">{b.n}</td><td className="num">{b.rate == null ? '—' : `${b.rate}%`}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="g-panel-body"><p>A well-calibrated band signs about as often as its label says. With {ledger.scored} calls these rates are still noisy.</p></div>
        </section>
      </div>
    </>
  )
}

function DefinitionSection({ def }: { def: ModelHealthDefinition }) {
  const m = def.currentModel
  const v = verdict(def)
  return (
    <section className="g-panel g-span-12" data-testid="scorecard-definition">
      <PanelHeading title={`Will the transfer complete within ${def.horizonDays} days?`} right={m ? <span className="g-claim-id">model {m.version}</span> : undefined} />
      <div style={{ paddingTop: 20 }}>
        <p className={`g-callout ${v.tone === 'ok' ? 'ok' : v.tone === 'none' ? 'none' : ''}`} data-testid="scorecard-verdict">{v.text}</p>
        {m && (
          <div className="g-stat-row">
            <div><span className="g-eyebrow">TRAINED</span><strong>{formatDate(m.trainedAt)}</strong></div>
            <div><span className="g-eyebrow">TRAINING RUMOURS</span><strong>{m.nTrainSamples}</strong></div>
            <div><span className="g-eyebrow">TEST RUMOURS</span><strong>{m.nTestSamples}</strong></div>
            <div><span className="g-eyebrow">DATA</span><strong>{m.trainingDataSource === 'db' ? 'Real outcomes' : 'Synthetic'}</strong></div>
          </div>
        )}
        <div className="g-chart-frame"><ModelCalibrationChart definition={def} /></div>
      </div>
    </section>
  )
}

export default function ScorecardView({ health, error = null, ledger = null }: Props) {
  return (
    <DeskPage
      eyebrow="SCORECARD"
      title="How often are we right"
      accent="?"
      intro="Every rumour gets a likelihood. This page checks those likelihoods against what actually happened. If we say 70%, roughly 7 in 10 of those transfers should go through. Misses included."
    >
      {ledger && ledger.rows.length > 0 ? (
        <LedgerSection ledger={ledger} />
      ) : (
        <div className="g-connection-notice" data-testid="scorecard-no-ledger">
          <p>No resolved calls are available from the desk right now, so there is nothing to score yet.</p>
          <p style={{ marginTop: 12 }}>
            <Link href="/rumours" className="g-green-link" data-testid="scorecard-no-ledger-rumours-cta">
              Browse rumours →
            </Link>
          </p>
        </div>
      )}

      <div className="g-score-grid">
        <MeterGuide />
        <section className="g-panel g-span-12">
          <PanelHeading title="The forecasting model" right={<span className="g-count-label">IN TESTING</span>} />
          <div className="g-panel-body">
            <p>Separately from the live likelihoods above, a statistical model is being trained to forecast completion. It is not used on the desk until it has been tested on enough real outcomes. Brier score: the average squared gap between forecast and outcome (0 is perfect, always guessing 50% scores 0.25). On the calibration chart, dots on the dashed line mean the percentages match reality; dots below it mean the model was too confident.</p>
          </div>
        </section>
        {error ? (
          <p className="g-connection-notice g-span-12" data-testid="scorecard-error">The model scorecard is unavailable right now ({error}). Forecasts are still shown on each rumour.</p>
        ) : !health || health.definitions.length === 0 ? (
          <p className="g-connection-notice g-span-12" data-testid="scorecard-empty">No forecasting model is active yet, so there is nothing to score.</p>
        ) : (
          health.definitions.map((def) => <DefinitionSection key={def.id} def={def} />)
        )}
      </div>

      <p className="g-muted" style={{ fontSize: 12 }}>Official denials and contradicting evidence are always shown on every rumour.</p>
    </DeskPage>
  )
}
