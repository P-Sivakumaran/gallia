import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlayerCard from './PlayerCard'
import type { PlayerCardData } from '@/types'

const mockCard: PlayerCardData = {
  playerId: 10,
  positionGroup: 'Forward',
  overall: 88,
  attributes: {
    finishing: 91,
    creation: 82,
    passing: 79,
    dribbling: 86,
    defending: 44,
    duels: 65,
    discipline: 72,
  },
  limitedSample: false,
  minutes: 1800,
  poolSize: 340,
}

describe('PlayerCard', () => {
  it('renders graceful empty state when card is null or undefined', () => {
    render(<PlayerCard card={null} position="Midfielder" competitionName="Premier League" />)

    expect(screen.getByRole('region', { name: 'Gallia card' })).toBeInTheDocument()
    expect(screen.getByText('No rating available')).toBeInTheDocument()
    expect(screen.getByText(/Percentile card ratings are computed/)).toBeInTheDocument()
    expect(screen.queryByText('Finishing')).not.toBeInTheDocument()
    expect(screen.getByTestId('player-card-empty-season-cta')).toHaveAttribute('href', '#season-statistics')
  })

  it('renders overall score, pool size, and all 7 attribute bars with 1-99 values', () => {
    render(
      <PlayerCard
        card={mockCard}
        position="ST"
        competitionName="Premier League"
        competitionId={39}
        playerName="Kylian Mbappé"
      />
    )

    expect(screen.getByLabelText('Gallia card for Kylian Mbappé')).toBeInTheDocument()
    expect(screen.getByLabelText('Overall rating 88')).toHaveTextContent('88')
    expect(screen.getByText('Forward')).toBeInTheDocument()
    expect(screen.getByText('Pool size: 340 players')).toBeInTheDocument()
    const leagueLinks = screen.getAllByTestId('player-card-league-link')
    expect(leagueLinks[0]).toHaveAttribute('href', '/leagues/39')
    expect(leagueLinks[0]).toHaveTextContent('Premier League')

    // 7 attributes
    const attributes = [
      { name: 'Finishing', val: 91 },
      { name: 'Creation', val: 82 },
      { name: 'Passing', val: 79 },
      { name: 'Dribbling', val: 86 },
      { name: 'Defending', val: 44 },
      { name: 'Duels', val: 65 },
      { name: 'Discipline', val: 72 },
    ]

    for (const attr of attributes) {
      expect(screen.getByText(attr.name)).toBeInTheDocument()
      const progressbar = screen.getByRole('progressbar', { name: attr.name })
      expect(progressbar).toHaveAttribute('aria-valuenow', String(attr.val))
      expect(progressbar).toHaveAttribute('aria-valuemin', '1')
      expect(progressbar).toHaveAttribute('aria-valuemax', '99')
    }

    // Footnote (competition is a link, so match the surrounding copy)
    expect(screen.getByText(/Percentile vs Forward in/)).toBeInTheDocument()
    expect(screen.getByText(/per 90; Gallia's own rating/)).toBeInTheDocument()
    expect(leagueLinks).toHaveLength(2)

    // No limited sample badge when false
    expect(screen.queryByText(/Limited sample/)).not.toBeInTheDocument()
  })

  it('renders limited sample badge when card.limitedSample is true', () => {
    render(
      <PlayerCard
        card={{ ...mockCard, limitedSample: true }}
        position="Forward"
        competitionName="La Liga"
      />
    )

    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent('Limited sample (< 450 min)')
  })
})
