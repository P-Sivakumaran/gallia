import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { trimEvents, trimLineups, trimPlayerStats, trimShots, trimTeamStats } from './matchDetail.js'

// Synthetic fixtures in TheStatsAPI's response shape (no provider data in this public repo).
const load = (name: string) => JSON.parse(readFileSync(join(__dirname, '__fixtures__', `match-${name}.json`), 'utf8'))

describe('match detail trimming', () => {
  it('keeps both lineups with formation, starting XI and bench', () => {
    const l = trimLineups(load('lineups').data)
    expect(l.home.formation).toBe('4-4-2')
    expect(l.home.startingXi).toHaveLength(11)
    expect(l.away.startingXi).toHaveLength(11)
    expect(l.home.bench.length).toBeGreaterThan(0)
  })

  it('keeps key events only: the 4 goals, cards, subs, VAR; drops fouls and corners', () => {
    const e = trimEvents(load('timeline').data)
    const types = new Set(e.map((x) => x.type))
    expect(e.filter((x) => x.type === 'goal')).toHaveLength(4)
    expect(types.has('foul')).toBe(false)
    expect(types.has('corner_kick')).toBe(false)
    expect(types.has('substitution')).toBe(true)
  })

  it('flattens team stats to the full-match values', () => {
    const t = trimTeamStats(load('mstats').data)
    expect(t.ball_possession).toEqual({ home: 60, away: 40 })
    expect(t.expected_goals).toEqual({ home: 2.1, away: 0.4 })
  })

  it('trims player and shot rows and stores far less than the raw responses', () => {
    const players = trimPlayerStats(load('pstats').data)
    const shots = trimShots(load('shotmap').data)
    expect(players[0]).toMatchObject({ name: 'Test Player 10', rating: 8.4, minutes: 90, goals: 2 })
    expect(players[1]).toMatchObject({ position: 'G', saves: 3 })
    expect(shots.filter((s) => s.isGoal).length).toBeGreaterThanOrEqual(3)
    const raw = ['lineups', 'timeline', 'mstats', 'pstats', 'shotmap'].reduce((n, f) => n + JSON.stringify(load(f)).length, 0)
    const kept = JSON.stringify([trimLineups(load('lineups').data), trimEvents(load('timeline').data), trimTeamStats(load('mstats').data), players, shots]).length
    expect(kept / raw).toBeLessThan(0.8)
  })
})
