import { describe, it, expect } from 'vitest'
import { computeCards, percentile, toScale, type StatRow } from './card.js'

const row = (playerId: number, over: Partial<StatRow> & { d?: Record<string, Record<string, number>> } = {}): StatRow => ({
  playerId, positionGroup: 'FWD', minutes: 900, goals: 2, assists: 1, xg: 2, xa: 1, rating: 7,
  detail: over.d ?? { shooting: { shots_on_target: 5 }, passing: { pass_accuracy: 75, key_passes: 5, accurate_passes: 200, accurate_crosses: 2 }, duels: { successful_dribbles: 5, total_duels_won: 30, aerial_duels_won: 5, ground_duels_won_percentage: 45 }, defending: { tackles: 5, interceptions: 2 }, discipline: { yellow_cards: 1, red_cards: 0 }, scoring: { big_chances_created: 1, goal_conversion_percentage: 10 } },
  ...over,
})

describe('percentile and scale', () => {
  it('counts half of ties and respects lower-is-better', () => {
    expect(percentile([1, 2, 3, 4], 3)).toBe(0.625)
    expect(percentile([1, 2, 3, 4], 1, true)).toBe(0.875)
    expect(toScale(0)).toBe(1)
    expect(toScale(1)).toBe(99)
  })
})

describe('computeCards', () => {
  const pool = [1, 2, 3, 4, 5, 6].map((i) => row(i, { goals: i, xg: i, rating: 6 + i * 0.2 }))

  it('ranks finishing within the position group and keeps every score in 1–99', () => {
    const cards = computeCards(pool)
    const best = cards.find((c) => c.playerId === 6)!
    const worst = cards.find((c) => c.playerId === 1)!
    expect(best.attributes.finishing).toBeGreaterThan(worst.attributes.finishing)
    expect(best.overall).toBeGreaterThan(worst.overall)
    for (const c of cards) for (const v of [c.overall, ...Object.values(c.attributes)]) expect(v).toBeGreaterThanOrEqual(1), expect(v).toBeLessThanOrEqual(99)
  })

  it('marks low-minute players as a limited sample and leaves them out of the pool', () => {
    const cards = computeCards([...pool, row(7, { minutes: 90, goals: 3, xg: 3 })])
    const sub = cards.find((c) => c.playerId === 7)!
    expect(sub.limitedSample).toBe(true)
    expect(sub.poolSize).toBe(6)
  })

  it('gives goalkeepers no card', () => {
    expect(computeCards([row(9, { positionGroup: 'GK' })])).toEqual([])
  })

  it('scores discipline so that fewer cards is better', () => {
    const clean = row(10, { d: { discipline: { yellow_cards: 0, red_cards: 0 } } })
    const booked = row(11, { d: { discipline: { yellow_cards: 6, red_cards: 1 } } })
    const cards = computeCards([clean, booked, ...pool])
    expect(cards.find((c) => c.playerId === 10)!.attributes.discipline).toBeGreaterThan(cards.find((c) => c.playerId === 11)!.attributes.discipline)
  })
})
