import { clsx } from 'clsx'
import type { RumourStatus } from '@/types'

/**
 * Status pill from the raea brand kit (RumourCardMotion StatusBadge): a dot in the status colour
 * plus the label, so status never rests on colour alone. Pass a new `popKey` to overshoot once
 * when a live update changes the status.
 */
const STYLE: Record<RumourStatus, { pill: string; dot: string }> = {
  HOT: { pill: 'bg-hot/20 text-hot-fg border-hot/50', dot: 'bg-hot' },
  PENDING: { pill: 'bg-surface-overlay/50 text-ink-soft border-pending/40', dot: 'bg-pending' },
  COMPLETED: { pill: 'bg-completed/20 text-completed-fg border-completed/50', dot: 'bg-completed' },
  FAILED: { pill: 'bg-failed/20 text-failed-fg border-failed/50', dot: 'bg-failed' },
  DENIED: { pill: 'bg-denied-deep/40 text-denied-fg border-denied-line/60', dot: 'bg-denied' },
}

interface Props {
  status: RumourStatus | string
  popKey?: number
  className?: string
}

export default function StatusBadge({ status, popKey = 0, className }: Props) {
  const style = STYLE[status as RumourStatus] ?? STYLE.PENDING
  return (
    <span
      key={popKey}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
        style.pill,
        popKey > 0 && 'motion-safe:animate-status-pop',
        className,
      )}
    >
      <span aria-hidden className={clsx('h-1.5 w-1.5 rounded-full', style.dot)} />
      {status}
    </span>
  )
}
