import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SeasonStatsTable from './SeasonStatsTable'
import type { PlayerSeasonLine } from '@/types'

const mockSeasons: PlayerSeasonLine[] = [
  {
    competition: { id: 1, name: 'Premier League' },
    season: '2024-25',
    current: true,
    clubId: 10,
    appearances: 22,
    starts: 20,
    minutes: 1850,
    goals: 15,
    assists: 6,
    xg: 13.8,
    xa: 5.2,
    rating: 7.85,
    detail: {
      passing: {
        passes_completed: 650,
        key_passes: 38,
        crosses: 14,
      },
      shooting: {
        shots_on_target: 42,
      },
    },
    card: null,
  },
]

describe('SeasonStatsTable', () => {
  it('renders empty message when no seasons provided', () => {
    render(<SeasonStatsTable seasons={[]} />)
    expect(screen.getByText('No season statistics recorded for this player.')).toBeInTheDocument()
  })

  it('renders competition rows with minutes, goals, assists, xG, xA, and rating', () => {
    render(<SeasonStatsTable seasons={mockSeasons} />)

    expect(screen.getByText('Premier League')).toBeInTheDocument()
    expect(screen.getByText('Current')).toBeInTheDocument()
    expect(screen.getByText('2024-25')).toBeInTheDocument()
    expect(screen.getByText('22 (20)')).toBeInTheDocument()
    expect(screen.getByText('1,850')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('13.80')).toBeInTheDocument()
    expect(screen.getByText('5.20')).toBeInTheDocument()
    expect(screen.getByText('7.85')).toBeInTheDocument()
  })

  it('toggles detail breakdown when Details button is clicked', () => {
    render(<SeasonStatsTable seasons={mockSeasons} />)

    const btn = screen.getByRole('button', { name: 'Details' })
    expect(screen.queryByText('Passes Completed')).not.toBeInTheDocument()

    fireEvent.click(btn)

    expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument()
    expect(screen.getByText('Passing')).toBeInTheDocument()
    expect(screen.getByText('Passes Completed')).toBeInTheDocument()
    expect(screen.getByText('650')).toBeInTheDocument()
    expect(screen.getByText('Shooting')).toBeInTheDocument()
    expect(screen.getByText('Shots On Target')).toBeInTheDocument()
  })
})
