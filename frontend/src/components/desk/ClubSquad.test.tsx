import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClubSquad, { groupSquad, normalisePositionGroup } from './ClubSquad'
import type { ClubSquad as ClubSquadData } from '@/types'

describe('normalisePositionGroup / groupSquad', () => {
  it('buckets GK/DEF/MID/FWD', () => {
    expect(normalisePositionGroup('Goalkeeper')).toBe('GK')
    expect(normalisePositionGroup('CB')).toBe('DEF')
    expect(normalisePositionGroup('CM')).toBe('MID')
    expect(normalisePositionGroup('ST')).toBe('FWD')
  })

  it('groups players by position', () => {
    const groups = groupSquad([
      {
        id: 1,
        name: 'Keeper',
        positionGroup: 'GK',
        shirtNumber: 1,
        age: 30,
        nationality: 'EN',
        competition: 'PL',
        appearances: 10,
        minutes: 900,
        goals: 0,
        assists: 0,
        rating: 7,
        card: null,
      },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('GK')
  })
})

describe('ClubSquad', () => {
  it('uses Season squad heading and empty copy', () => {
    const squad: ClubSquadData = {
      source: 'TheStatsAPI',
      club: { id: 10, name: 'Test FC' },
      players: [],
    }
    render(<ClubSquad squad={squad} />)
    expect(screen.getByRole('heading', { name: 'Season squad' })).toBeInTheDocument()
    expect(screen.getByText(/No season squad stats synced/)).toBeInTheDocument()
  })
})
