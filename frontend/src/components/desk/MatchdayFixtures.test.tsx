import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MatchdayFixtures from './MatchdayFixtures'
import type { MatchdayFixturesResponse } from '@/types'

const data: MatchdayFixturesResponse = {
  source: 'TheStatsAPI',
  matchday: 5,
  fixtures: [
    {
      id: 101,
      kickoffAt: '2026-11-20T15:00:00.000Z',
      status: 'finished',
      hasDetail: true,
      home: { id: 1, name: 'Home FC', goals: 2 },
      away: { id: 2, name: 'Away FC', goals: 0 },
    },
  ],
}

describe('MatchdayFixtures', () => {
  it('links fixtures to /match/[id] and supports prev/next', () => {
    render(<MatchdayFixtures competitionId={7} data={data} hasNext />)
    expect(screen.getByTestId('matchday-fixtures')).toHaveTextContent('Matchday 5')
    expect(screen.getByRole('link', { name: /Home FC/i }).closest('a')).toHaveAttribute('href', '/match/101')
    expect(screen.getByLabelText(/Previous matchday, 4/)).toHaveAttribute('href', '/leagues/7?matchday=4')
    expect(screen.getByLabelText(/Next matchday, 6/)).toHaveAttribute('href', '/leagues/7?matchday=6')
  })

  it('disables previous on matchday 1', () => {
    render(<MatchdayFixtures competitionId={7} data={{ ...data, matchday: 1 }} hasNext={false} />)
    expect(screen.getByText('Previous')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Next')).toHaveAttribute('aria-disabled', 'true')
  })
})
