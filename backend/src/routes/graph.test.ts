import { describe, expect, it } from 'vitest'
import { isPlaceholderClub, rumourKind, stablePosition } from './graph.js'

describe('graph helpers', () => {
  it('treats feed placeholder clubs as not-a-club', () => {
    expect(isPlaceholderClub({ name: 'TBC' })).toBe(true)
    expect(isPlaceholderClub({ name: ' tba ' })).toBe(true)
    expect(isPlaceholderClub({ name: 'Unknown' })).toBe(true)
    expect(isPlaceholderClub({ name: 'Arsenal' })).toBe(false)
    expect(isPlaceholderClub({ name: 'TBC United' })).toBe(false)
  })

  it('labels Sportmonks-only rumours as feed transfers', () => {
    expect(rumourKind({ name: 'Sportmonks Aggregator' })).toBe('feed')
    expect(rumourKind({ name: 'BBC Sport' })).toBe('news')
    expect(rumourKind({ name: 'Google News Transfers' })).toBe('news')
  })

  it('gives each node the same start position on every call, inside the canvas', () => {
    const a = stablePosition('club-8')
    expect(stablePosition('club-8')).toEqual(a)
    expect(stablePosition('club-9')).not.toEqual(a)
    for (const k of ['club-1', 'player-12', 'player-999']) {
      const p = stablePosition(k)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(800)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(600)
    }
  })
})
