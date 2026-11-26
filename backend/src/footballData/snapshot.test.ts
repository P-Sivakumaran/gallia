import { describe, it, expect } from 'vitest'
import { SETTLE_MS, closedMatchdays } from './snapshot.js'

const NOW = Date.UTC(2026, 10, 26, 12)
const f = (matchday: number, status: string, hoursAgo: number) => ({ matchday, status, kickoffAt: new Date(NOW - hoursAgo * 3_600_000) })

describe('closedMatchdays', () => {
  it('closes a matchday only when every fixture is over and settled', () => {
    const fixtures = [
      f(10, 'finished', 72), f(10, 'finished', 48),
      f(11, 'finished', 30), f(11, 'finished', 2), // last match not settled yet (< 3 h)
      f(12, 'scheduled', -48),
    ]
    expect(closedMatchdays(fixtures, NOW)).toEqual([10])
    expect(closedMatchdays(fixtures, NOW + SETTLE_MS)).toEqual([10, 11])
  })

  it('does not close a matchday while any fixture is postponed', () => {
    expect(closedMatchdays([f(5, 'finished', 30), f(5, 'postponed', 30)], NOW)).toEqual([])
  })
})
