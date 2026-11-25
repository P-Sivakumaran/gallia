import type { RumourStatus } from '@/types'

const STATUS_CLASS: Record<RumourStatus, string> = {
  HOT: 'g-status',
  PENDING: 'g-status g-status-smoke',
  COMPLETED: 'g-status g-status-confirmed',
  FAILED: 'g-status g-status-denied',
  DENIED: 'g-status g-status-denied',
}

/** Rumour status as a desk badge (gallia.css .g-status). */
export default function DeskStatus({ status }: { status: RumourStatus }) {
  return <span className={STATUS_CLASS[status]}><span />{status}</span>
}
