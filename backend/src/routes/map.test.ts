import { describe, expect, it } from 'vitest'
import { buildMap, type MapRumour } from './map.js'

const club = (id: number, name: string, lat: number | null = 51, lng: number | null = 0, isPlaceholder = false) => ({
  id, name, shortName: null, country: 'England', league: 'Premier League', city: 'London', stadium: null, lat, lng, isPlaceholder,
})

const rumour = (id: number, from: ReturnType<typeof club>, to: ReturnType<typeof club>, over: Partial<MapRumour> = {}): MapRumour => ({
  id,
  status: 'PENDING',
  computedLikelihood: 50,
  player: { id: id * 10, name: `Player ${id}` },
  source: { name: 'BBC Sport' },
  fromClub: from,
  toClub: to,
  ...over,
})

describe('buildMap', () => {
  const arsenal = club(1, 'Arsenal')
  const chelsea = club(2, 'Chelsea')
  const unplacedClub = club(3, 'Zira', null, null)
  const tbc = club(4, 'TBC', null, null, true)

  it('draws a route only when both clubs are placed', () => {
    const m = buildMap([rumour(1, arsenal, chelsea), rumour(2, arsenal, unplacedClub)], false)
    expect(m.routes).toHaveLength(1)
    expect(m.unplaced).toEqual([expect.objectContaining({ rumourId: 2, reason: 'no-coordinates' })])
    expect(m.clubs.map((c) => c.id).sort()).toEqual([1, 2])
  })

  it('lists placeholder destinations as unknown, never as a club', () => {
    const m = buildMap([rumour(1, arsenal, tbc)], false)
    expect(m.unplaced).toEqual([expect.objectContaining({ reason: 'destination-unknown', to: null })])
    expect(m.clubs.find((c) => c.id === 4)).toBeUndefined()
  })

  it('counts open rumours per club', () => {
    const m = buildMap([
      rumour(1, arsenal, chelsea, { status: 'HOT' }),
      rumour(2, chelsea, arsenal, { status: 'COMPLETED' }),
    ], false)
    const a = m.clubs.find((c) => c.id === 1)!
    expect(a.rumourCount).toBe(2)
    expect(a.openRumourCount).toBe(1)
  })

  it('hides feed-only transfers unless asked', () => {
    const feed = rumour(1, arsenal, chelsea, { source: { name: 'Sportmonks Aggregator' } })
    expect(buildMap([feed], false).routes).toHaveLength(0)
    expect(buildMap([feed], false).meta.feedHidden).toBe(1)
    expect(buildMap([feed], true).routes).toHaveLength(1)
  })
})
