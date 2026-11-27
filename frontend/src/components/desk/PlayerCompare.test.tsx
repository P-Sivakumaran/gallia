import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PlayerCompareView from './PlayerCompareView'
import type { PlayerComparePlayerData } from './PlayerCompareView'
import { api } from '@/lib/api'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

const playerA: PlayerComparePlayerData = {
  player: {
    id: 1,
    name: 'Erling Haaland',
    age: 24,
    position: 'ST',
    nationality: 'Norway',
    currentClub: { id: 10, name: 'Manchester City', shortName: 'MCI', league: 'Premier League', country: 'England', logoUrl: null },
    contractEnd: '2027-06-30',
    marketValue: 180000000,
    photoUrl: null,
  },
  footballData: {
    source: 'TheStatsAPI',
    player: {
      id: 1,
      name: 'Erling Haaland',
      age: 24,
      nationality: 'Norway',
      positionGroup: 'Forward',
      dateOfBirth: '2000-07-21',
      heightCm: 194,
      preferredFoot: 'left',
      shirtNumber: 9,
      currentClubId: 10,
    },
    seasons: [
      {
        competition: { id: 1, name: 'Premier League' },
        season: '2024-25',
        current: true,
        clubId: 10,
        appearances: 20,
        starts: 20,
        minutes: 1800,
        goals: 20,
        assists: 4,
        xg: 18.5,
        xa: 3.2,
        rating: 8.1,
        detail: null,
        card: {
          playerId: 1,
          positionGroup: 'Forward',
          overall: 91,
          attributes: {
            finishing: 94,
            creation: 72,
            passing: 75,
            dribbling: 80,
            defending: 40,
            duels: 82,
            discipline: 76,
          },
          limitedSample: false,
          minutes: 1800,
          poolSize: 320,
        },
      },
    ],
  },
}

const playerB: PlayerComparePlayerData = {
  player: {
    id: 2,
    name: 'Harry Kane',
    age: 31,
    position: 'ST',
    nationality: 'England',
    currentClub: { id: 20, name: 'Bayern München', shortName: 'BAY', league: 'Bundesliga', country: 'Germany', logoUrl: null },
    contractEnd: '2027-06-30',
    marketValue: 100000000,
    photoUrl: null,
  },
  footballData: {
    source: 'TheStatsAPI',
    player: {
      id: 2,
      name: 'Harry Kane',
      age: 31,
      nationality: 'England',
      positionGroup: 'Forward',
      dateOfBirth: '1993-07-28',
      heightCm: 188,
      preferredFoot: 'right',
      shirtNumber: 9,
      currentClubId: 20,
    },
    seasons: [
      {
        competition: { id: 2, name: 'Bundesliga' },
        season: '2024-25',
        current: true,
        clubId: 20,
        appearances: 19,
        starts: 19,
        minutes: 1710,
        goals: 18,
        assists: 7,
        xg: 15.2,
        xa: 6.4,
        rating: 8.35,
        detail: null,
        card: {
          playerId: 2,
          positionGroup: 'Forward',
          overall: 89,
          attributes: {
            finishing: 92,
            creation: 88,
            passing: 86,
            dribbling: 78,
            defending: 45,
            duels: 75,
            discipline: 82,
          },
          limitedSample: false,
          minutes: 1710,
          poolSize: 310,
        },
      },
    ],
  },
}

describe('PlayerCompareView', () => {
  it('renders both players side by side with identities, ratings, mirrored attribute bars, and per-90 metrics', () => {
    render(<PlayerCompareView initialPlayerA={playerA} initialPlayerB={playerB} />)

    // Identity
    expect(screen.getAllByText('Erling Haaland').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Harry Kane').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Manchester City/)).toBeInTheDocument()
    expect(screen.getByText(/Bayern München/)).toBeInTheDocument()

    const clubLinks = screen.getAllByTestId('compare-club-link')
    expect(clubLinks[0]).toHaveAttribute('href', '/club/10')
    expect(clubLinks[0]).toHaveTextContent('Manchester City')
    expect(clubLinks[1]).toHaveAttribute('href', '/club/20')

    const leagueLinks = screen.getAllByTestId('compare-league-link')
    expect(leagueLinks[0]).toHaveAttribute('href', '/leagues/1')
    expect(leagueLinks[0]).toHaveTextContent('Premier League')

    // Overall ratings
    expect(screen.getByText('91')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()

    // Mirrored attribute progressbars
    const finishingBarA = screen.getByRole('progressbar', { name: /Erling Haaland Finishing: 94/i })
    expect(finishingBarA).toHaveAttribute('aria-valuenow', '94')
    const finishingBarB = screen.getByRole('progressbar', { name: /Harry Kane Finishing: 92/i })
    expect(finishingBarB).toHaveAttribute('aria-valuenow', '92')

    // Central label
    expect(screen.getByText('Finishing')).toBeInTheDocument()
    expect(screen.getByText('Creation')).toBeInTheDocument()
    expect(screen.getByText('Passing')).toBeInTheDocument()
    expect(screen.getByText('Dribbling')).toBeInTheDocument()
    expect(screen.getByText('Defending')).toBeInTheDocument()
    expect(screen.getByText('Duels')).toBeInTheDocument()
    expect(screen.getByText('Discipline')).toBeInTheDocument()

    // Per-90 metrics
    // Minutes: 1,800 vs 1,710
    expect(screen.getByText('1,800')).toBeInTheDocument()
    expect(screen.getByText('1,710')).toBeInTheDocument()

    // Goals / 90: (20/1800)*90 = 1.00 vs (18/1710)*90 = 0.95
    expect(screen.getByText('1.00')).toBeInTheDocument()
    expect(screen.getByText('0.95')).toBeInTheDocument()

    // Assists / 90: (4/1800)*90 = 0.20 vs (7/1710)*90 = 0.37
    expect(screen.getByText('0.20')).toBeInTheDocument()
    expect(screen.getByText('0.37')).toBeInTheDocument()

    // Ratings
    expect(screen.getByText('8.10')).toBeInTheDocument()
    expect(screen.getByText('8.35')).toBeInTheDocument()
  })

  it('swaps Player A and Player B when swap button is clicked', () => {
    render(<PlayerCompareView initialPlayerA={playerA} initialPlayerB={playerB} />)

    const swapBtn = screen.getByRole('button', { name: /Swap Player A and Player B/i })
    fireEvent.click(swapBtn)

    // Now Player A slot contains Harry Kane, Player B slot contains Erling Haaland
    const slotA = screen.getByText('Player A').closest('.g-compare-slot')!
    expect(slotA).toHaveTextContent('Harry Kane')

    const slotB = screen.getByText('Player B').closest('.g-compare-slot')!
    expect(slotB).toHaveTextContent('Erling Haaland')
  })

  it('renders search picker when initial players are missing or removed', async () => {
    vi.spyOn(api.players, 'search').mockResolvedValueOnce([playerB.player])

    render(<PlayerCompareView initialPlayerA={playerA} initialPlayerB={null} />)

    // Slot B should have picker
    expect(screen.getByRole('region', { name: 'Select Player B' })).toBeInTheDocument()
    const input = screen.getByPlaceholderText('Search player by name…')

    fireEvent.change(input, { target: { value: 'Kane' } })

    await waitFor(() => {
      expect(screen.getByText('Harry Kane')).toBeInTheDocument()
    })
  })

  it('clears the compare picker search when no players match', async () => {
    vi.spyOn(api.players, 'search').mockResolvedValueOnce([])

    render(<PlayerCompareView initialPlayerA={playerA} initialPlayerB={null} />)
    const input = screen.getByPlaceholderText('Search player by name…') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'zzzz' } })

    await waitFor(() => {
      expect(screen.getByTestId('compare-picker-clear-search')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('compare-picker-clear-search'))
    expect(input.value).toBe('')
    expect(screen.queryByTestId('compare-picker-empty')).not.toBeInTheDocument()
  })
})
