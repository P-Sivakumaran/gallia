import { clsx } from 'clsx'
import type { RumourStatus } from '@/types'
import TruthMeter from './TruthMeter'
import StatusBadge from './StatusBadge'

/**
 * "How to read the meter": the raea meter-states still as a page block. Four example readings,
 * then one 0–100 axis with each pinned where it sits. The readings are examples, not live rumours.
 */
const EXAMPLES: Array<{ score: number; status: RumourStatus; verdict: string; edge: string; stripe: string; pin: string; text: string }> = [
  { score: 15, status: 'FAILED', verdict: 'Deal off', edge: 'border-failed/45', stripe: 'bg-failed', pin: 'bg-failed', text: 'text-failed-fg' },
  { score: 45, status: 'PENDING', verdict: 'Early talks', edge: 'border-line', stripe: 'bg-pending', pin: 'bg-pending', text: 'text-pending' },
  { score: 78, status: 'HOT', verdict: 'Heating up', edge: 'border-hot/45', stripe: 'bg-hot', pin: 'bg-hot', text: 'text-hot-fg' },
  { score: 96, status: 'COMPLETED', verdict: 'Signed', edge: 'border-completed/45', stripe: 'bg-completed', pin: 'bg-completed', text: 'text-completed-fg' },
]

export default function MeterScale() {
  return (
    <section aria-labelledby="meter-scale-title" className="space-y-6">
      <div>
        <h2 id="meter-scale-title" className="text-3xl font-black tracking-display text-ink-primary">
          How to read <span className="text-pitch-500">the meter</span>
        </h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Every rumour gets one likelihood from 0 to 100. Above 70 it turns hot. Once the deal is signed or dies, the
          meter shows how it ended. Example readings:
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {EXAMPLES.map((e) => (
          <li key={e.status} className={clsx('relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl border bg-card px-3 pb-5 pt-6 shadow-card', e.edge)}>
            <span aria-hidden className={clsx('absolute inset-x-0 top-0 h-1', e.stripe)} />
            <StatusBadge status={e.status} />
            <TruthMeter score={e.score} status={e.status} size="md" intro={false} />
            <p className="text-lg font-black tracking-display text-ink-primary">{e.verdict}</p>
          </li>
        ))}
      </ul>

      {/* One continuous scale with each example pinned where it sits */}
      <div aria-hidden className="relative mx-2 pb-8 pt-9">
        <div className="h-2.5 rounded-full bg-surface-raised" />
        {EXAMPLES.map((e) => (
          <div key={e.status} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${e.score}%` }}>
            <p className={clsx('font-mono text-base font-extrabold', e.text)}>{e.score}</p>
            <div className={clsx('mx-auto mt-1 h-8 w-1.5 rounded-sm', e.pin)} />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-xs font-bold text-ink-muted">
          {[0, 25, 50, 75, 100].map((v) => (
            <span key={v} className="w-0 text-center">
              <span className="-ml-3 inline-block w-6">{v}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
