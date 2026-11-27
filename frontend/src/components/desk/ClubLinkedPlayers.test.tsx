import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClubLinkedPlayers, { sortLinkedPlayers } from './ClubLinkedPlayers'
import type { Player } from '@/types'

const base: Player = {
  id: 1,
  name: 'Ada Forward',
  age: 24,
  position: 'ST',
  currentClub: null,
  contractEnd: '2027-06-30',
  marketValue: 45_000_000,
  nationality: 'Spain',
  photoUrl: null,
}

describe('sortLinkedPlayers', () => {
  it('sorts by position then name', () => {
    const sorted = sortLinkedPlayers([
      { ...base, id: 2, name: 'Zoe Mid', position: 'CM' },
      { ...base, id: 3, name: 'Ann Mid', position: 'CM' },
      { ...base, id: 1, name: 'Ada Forward', position: 'ST' },
    ])
    expect(sorted.map((p) => p.name)).toEqual(['Ann Mid', 'Zoe Mid', 'Ada Forward'])
  })
})

describe('ClubLinkedPlayers', () => {
  it('shows empty state when no players', () => {
    render(<ClubLinkedPlayers players={[]} />)
    expect(screen.getByTestId('linked-players-empty')).toBeInTheDocument()
    expect(screen.getByTestId('linked-players-squad-cta')).toHaveAttribute('href', '#squad-title')
  })

  it('links player names and shows value / contract', () => {
    render(<ClubLinkedPlayers players={[base]} />)
    const link = screen.getByTestId('linked-player-link')
    expect(link).toHaveAttribute('href', '/player/1')
    expect(link).toHaveTextContent('Ada Forward')
    expect(screen.getByText('ST')).toBeInTheDocument()
    expect(screen.getByText('€45M')).toBeInTheDocument()
    expect(screen.getByText('Jun 2027')).toBeInTheDocument()
  })
})
