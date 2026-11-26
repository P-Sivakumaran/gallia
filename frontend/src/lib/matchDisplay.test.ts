import { describe, it, expect } from 'vitest'
import {
  filterTimelineEvents,
  parseFormationRows,
  shotMarker,
  orderedStatKeys,
  isStatPair,
} from './matchDisplay'
import type { MatchEvent, MatchShot } from '@/types'

describe('filterTimelineEvents', () => {
  it('keeps goals, cards, subs, VAR and drops period markers', () => {
    const events: MatchEvent[] = [
      { minute: 1, extra: 0, period: 1, type: 'period_start', team: null, player: null, related: null },
      { minute: 12, extra: 0, period: 1, type: 'goal', team: null, player: { id: '1', name: 'A' }, related: null },
      { minute: 40, extra: 0, period: 1, type: 'yellow_card', team: null, player: { id: '2', name: 'B' }, related: null },
      { minute: 55, extra: 0, period: 2, type: 'substitution', team: null, player: { id: '3', name: 'C' }, related: { id: '4', name: 'D' } },
      { minute: 70, extra: 0, period: 2, type: 'var', team: null, player: null, related: null },
      { minute: 90, extra: 0, period: 2, type: 'period_end', team: null, player: null, related: null },
      { minute: 88, extra: 0, period: 2, type: 'foul', team: null, player: null, related: null },
    ]
    const kept = filterTimelineEvents(events)
    expect(kept.map((e) => e.type)).toEqual(['goal', 'yellow_card', 'substitution', 'var'])
  })
})

describe('parseFormationRows', () => {
  it('parses 4-4-2', () => {
    expect(parseFormationRows('4-4-2')).toEqual([4, 4, 2])
  })

  it('returns empty for missing formation', () => {
    expect(parseFormationRows(null)).toEqual([])
  })
})

describe('shotMarker', () => {
  it('sizes goals and shots by xG and marks goals distinctly via caller shape', () => {
    const miss: MatchShot = {
      playerId: 'a',
      player: 'A',
      teamId: 'h',
      minute: 10,
      x: 12,
      y: 50,
      xg: 0.05,
      result: 'miss',
      situation: null,
      bodyPart: null,
      isGoal: false,
    }
    const goal: MatchShot = { ...miss, xg: 0.4, isGoal: true }
    const m = shotMarker(miss)
    const g = shotMarker(goal)
    expect(g.r).toBeGreaterThan(m.r)
    expect(m.cx).toBe(50)
    expect(m.cy).toBeGreaterThan(0)
  })
})

describe('orderedStatKeys / isStatPair', () => {
  it('prefers possession and xG first', () => {
    const stats = {
      fouls: { home: 1, away: 2 },
      ball_possession: { home: 60, away: 40 },
      expected_goals: { home: 1.2, away: 0.4 },
      noise: 'x',
    }
    expect(isStatPair(stats.ball_possession)).toBe(true)
    expect(isStatPair(stats.noise)).toBe(false)
    expect(orderedStatKeys(stats)).toEqual(['ball_possession', 'expected_goals', 'fouls'])
  })
})
