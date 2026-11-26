import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MatchView from './MatchView'
import type { MatchResponse } from '@/types'

function baseMatch(over: Partial<MatchResponse> = {}): MatchResponse {
  return {
    source: 'TheStatsAPI',
    match: {
      id: 99,
      competition: { id: 1, name: 'Premier League' },
      season: '2025/26',
      matchday: 12,
      kickoffAt: '2026-11-20T15:00:00.000Z',
      status: 'finished',
      home: { id: 10, name: 'Arsenal', goals: 2 },
      away: { id: 20, name: 'Chelsea', goals: 1 },
    },
    galliaPlayerIds: { pl_1: 501 },
    detail: null,
    ...over,
  }
}

describe('MatchView', () => {
  it('shows score and pending note when detail is null', () => {
    render(<MatchView data={baseMatch()} />)
    expect(screen.getByTestId('match-scoreboard')).toHaveTextContent('Arsenal')
    expect(screen.getByTestId('match-scoreboard')).toHaveTextContent('Chelsea')
    expect(screen.getByTestId('match-scoreboard')).toHaveTextContent('2')
    expect(screen.getByTestId('match-scoreboard')).toHaveTextContent('1')
    expect(screen.getByTestId('match-detail-pending')).toHaveTextContent(
      /Match detail arrives a few hours after full time/,
    )
    expect(screen.getByTestId('match-source')).toHaveTextContent('TheStatsAPI')
    expect(screen.queryByTestId('match-detail')).not.toBeInTheDocument()
  })

  it('renders timeline, shot goals with G label, and ratings when detail is present', () => {
    render(
      <MatchView
        data={baseMatch({
          detail: {
            lineups: {
              confirmed: true,
              home: {
                teamId: 'tm_h',
                formation: '4-4-2',
                startingXi: Array.from({ length: 11 }, (_, i) => ({
                  id: `pl_${i + 1}`,
                  name: `Home ${i + 1}`,
                  position: i === 0 ? 'G' : 'M',
                  shirt: i + 1,
                })),
                bench: [{ id: 'pl_12', name: 'Home 12', position: 'F', shirt: 12 }],
              },
              away: {
                teamId: 'tm_a',
                formation: '4-3-3',
                startingXi: Array.from({ length: 11 }, (_, i) => ({
                  id: `pl_a${i + 1}`,
                  name: `Away ${i + 1}`,
                  position: 'M',
                  shirt: i + 1,
                })),
                bench: [],
              },
            },
            events: [
              {
                minute: 12,
                extra: 0,
                period: 1,
                type: 'goal',
                team: { id: 'tm_h', name: 'Arsenal' },
                player: { id: 'pl_1', name: 'Home 1' },
                related: null,
              },
              {
                minute: 1,
                extra: 0,
                period: 1,
                type: 'period_start',
                team: null,
                player: null,
                related: null,
              },
            ],
            teamStats: {
              ball_possession: { home: 55, away: 45 },
              expected_goals: { home: 1.8, away: 0.9 },
            },
            playerStats: [
              {
                playerId: 'pl_1',
                name: 'Home 1',
                teamId: 'tm_h',
                position: 'F',
                rating: 8.2,
                started: true,
                minutes: 90,
                goals: 1,
                assists: 0,
                xg: 0.7,
                xa: 0.1,
                shots: 3,
                onTarget: 2,
                passes: 40,
                accuratePasses: 35,
                keyPasses: 2,
                tackles: 1,
                interceptions: 0,
                duelsWon: 4,
                saves: null,
              },
            ],
            shots: [
              {
                playerId: 'pl_1',
                player: 'Home 1',
                teamId: 'tm_h',
                minute: 12,
                x: 10,
                y: 50,
                xg: 0.4,
                result: 'goal',
                situation: 'open_play',
                bodyPart: 'right_foot',
                isGoal: true,
              },
              {
                playerId: 'pl_a2',
                player: 'Away 2',
                teamId: 'tm_a',
                minute: 40,
                x: 20,
                y: 40,
                xg: 0.08,
                result: 'saved',
                situation: null,
                bodyPart: null,
                isGoal: false,
              },
            ],
          },
        })}
      />,
    )

    expect(screen.queryByTestId('match-detail-pending')).not.toBeInTheDocument()
    expect(screen.getByTestId('match-timeline')).toHaveTextContent('Goal')
    expect(screen.getByTestId('match-timeline')).not.toHaveTextContent('period_start')
    expect(screen.getByTestId('match-timeline').querySelector('a')?.getAttribute('href')).toBe('/player/501')
    expect(screen.getByTestId('match-stat-bars')).toHaveTextContent(/Ball Possession/)
    expect(screen.getByTestId('match-shotmap').textContent).toContain('G')
    expect(screen.getByTestId('match-ratings')).toHaveTextContent('8.2')
    expect(screen.getByTestId('formation-arsenal')).toBeInTheDocument()
  })
})
