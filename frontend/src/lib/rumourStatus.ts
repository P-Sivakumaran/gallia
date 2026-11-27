import type { Rumour, RumourStatus } from '@/types'

const OPEN: RumourStatus[] = ['HOT', 'PENDING']
const RESOLVED: RumourStatus[] = ['COMPLETED', 'FAILED', 'DENIED']

export function isOpenRumourStatus(status: RumourStatus): boolean {
  return OPEN.includes(status)
}

export function isResolvedRumourStatus(status: RumourStatus): boolean {
  return RESOLVED.includes(status)
}

export function splitRumoursByOpenness(rumours: Rumour[]): {
  open: Rumour[]
  resolved: Rumour[]
} {
  return {
    open: rumours.filter((r) => isOpenRumourStatus(r.status)),
    resolved: rumours.filter((r) => isResolvedRumourStatus(r.status)),
  }
}
