import { describe, it, expect } from 'vitest'
import { isOpenRumourStatus, isResolvedRumourStatus, splitRumoursByOpenness } from './rumourStatus'
import type { Rumour } from '@/types'

function rumour(status: Rumour['status'], id: number): Rumour {
  return {
    id,
    player: {
      id: 1,
      name: 'P',
      age: null,
      position: 'ST',
      currentClub: null,
      contractEnd: null,
      marketValue: null,
      nationality: null,
      photoUrl: null,
    },
    fromClub: { id: 1, name: 'A', shortName: null, league: '', country: '', logoUrl: null },
    fromClubInferred: false,
    toClub: { id: 2, name: 'B', shortName: null, league: '', country: '', logoUrl: null },
    source: { id: 1, name: 'S', type: 'JOURNALIST', reliabilityScore: 0.5, url: null },
    reportedFeeMin: null,
    reportedFeeMax: null,
    currency: 'EUR',
    rumourDate: '2026-01-01',
    window: 'SUMMER',
    baseProbability: 50,
    computedLikelihood: 50,
    status,
    distinctSourceCount: 1,
    notes: null,
  }
}

describe('rumourStatus', () => {
  it('classifies open vs resolved statuses', () => {
    expect(isOpenRumourStatus('HOT')).toBe(true)
    expect(isOpenRumourStatus('PENDING')).toBe(true)
    expect(isResolvedRumourStatus('COMPLETED')).toBe(true)
    expect(isResolvedRumourStatus('FAILED')).toBe(true)
    expect(isResolvedRumourStatus('DENIED')).toBe(true)
    expect(isOpenRumourStatus('COMPLETED')).toBe(false)
  })

  it('splits rumours into open and resolved lists', () => {
    const { open, resolved } = splitRumoursByOpenness([
      rumour('HOT', 1),
      rumour('PENDING', 2),
      rumour('COMPLETED', 3),
      rumour('FAILED', 4),
      rumour('DENIED', 5),
    ])
    expect(open.map((r) => r.id)).toEqual([1, 2])
    expect(resolved.map((r) => r.id)).toEqual([3, 4, 5])
  })
})
