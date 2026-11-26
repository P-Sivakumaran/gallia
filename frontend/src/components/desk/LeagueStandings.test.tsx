import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { CompetitionTable, StandingRow } from '@/types'
import LeagueStandings, { FormPills, groupStandings, parseForm } from './LeagueStandings'

function row(partial: Partial<StandingRow> & Pick<StandingRow, 'position' | 'clubId' | 'club'>): StandingRow {
  return {
    played: 10,
    wins: 5,
    draws: 3,
    losses: 2,
    goalsFor: 15,
    goalsAgainst: 10,
    goalDifference: 5,
    points: 18,
    form: 'WWDLW',
    xgFor: 12.3,
    xgAgainst: 9.1,
    groupLabel: '',
    ...partial,
  }
}

describe('parseForm / FormPills', () => {
  it('parses W/D/L and ignores noise', () => {
    expect(parseForm('WwDxL')).toEqual(['W', 'W', 'D', 'L'])
    expect(parseForm(null)).toEqual([])
  })

  it('renders form pills with text labels (not colour alone)', () => {
    render(<FormPills form="WDL" />)
    const pills = screen.getByLabelText('Form W D L')
    expect(within(pills).getByText('W')).toHaveClass('g-form-w')
    expect(within(pills).getByText('D')).toHaveClass('g-form-d')
    expect(within(pills).getByText('L')).toHaveClass('g-form-l')
  })
})

describe('groupStandings', () => {
  it('keeps a single group when labels are empty', () => {
    const groups = groupStandings([row({ position: 1, clubId: 1, club: 'A' }), row({ position: 2, clubId: 2, club: 'B' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBeNull()
    expect(groups[0].rows).toHaveLength(2)
  })

  it('splits Champions League style groups by groupLabel', () => {
    const groups = groupStandings([
      row({ position: 1, clubId: 1, club: 'A', groupLabel: 'Group A' }),
      row({ position: 2, clubId: 2, club: 'B', groupLabel: 'Group A' }),
      row({ position: 1, clubId: 3, club: 'C', groupLabel: 'Group B' }),
    ])
    expect(groups.map((g) => g.label)).toEqual(['Group A', 'Group B'])
    expect(groups[0].rows.map((r) => r.club)).toEqual(['A', 'B'])
    expect(groups[1].rows.map((r) => r.club)).toEqual(['C'])
  })
})

describe('LeagueStandings', () => {
  const base: CompetitionTable = {
    source: 'TheStatsAPI',
    competition: 'Premier League',
    season: '2025/26',
    matchday: 12,
    frozenAt: '2026-11-20T12:00:00.000Z',
    standings: [row({ position: 1, clubId: 10, club: 'Arsenal' })],
    leaders: {
      goals: [{ playerId: 1, name: 'Haaland', clubId: 2, value: 14 }],
      assists: [],
      xg: [],
      rating: [],
    },
  }

  it('shows meta, form pills, and empty leader panels when a category has no entries', () => {
    render(<LeagueStandings table={base} />)
    expect(screen.getByTestId('league-meta')).toHaveTextContent(/Matchday 12/)
    expect(screen.getByTestId('league-meta')).toHaveTextContent(/TheStatsAPI/)
    expect(screen.getByText('Arsenal')).toHaveAttribute('href', '/club/10')
    expect(screen.getByLabelText(/Form/)).toBeInTheDocument()
    expect(screen.getByText('Haaland')).toHaveAttribute('href', '/player/1')
    expect(screen.getAllByTestId('leaders-empty').length).toBeGreaterThanOrEqual(1)
  })

  it('shows the null-leaders message when leaders is null', () => {
    render(<LeagueStandings table={{ ...base, leaders: null }} />)
    expect(screen.getByTestId('leaders-null')).toBeInTheDocument()
    expect(screen.queryByTestId('leaders-empty')).not.toBeInTheDocument()
  })

  it('renders group headings when groupLabel is set', () => {
    render(
      <LeagueStandings
        table={{
          ...base,
          standings: [
            row({ position: 1, clubId: 1, club: 'A', groupLabel: 'Group A' }),
            row({ position: 1, clubId: 2, club: 'B', groupLabel: 'Group B' }),
          ],
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Group A' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Group B' })).toBeInTheDocument()
  })
})
