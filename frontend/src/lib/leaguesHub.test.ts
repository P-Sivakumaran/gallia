import { describe, it, expect } from 'vitest'
import { groupCompetitionsByCountry } from './leaguesHub'
import type { FootballCompetition } from '@/types'

function comp(partial: Partial<FootballCompetition> & Pick<FootballCompetition, 'id' | 'name' | 'country'>): FootballCompetition {
  return {
    type: 'League',
    season: { id: 1, name: '2025/26' },
    ...partial,
  }
}

describe('groupCompetitionsByCountry', () => {
  it('groups and sorts by country then name', () => {
    const groups = groupCompetitionsByCountry([
      comp({ id: 2, name: 'Serie A', country: 'Italy' }),
      comp({ id: 1, name: 'Premier League', country: 'England' }),
      comp({ id: 3, name: 'Championship', country: 'England' }),
    ])
    expect(groups.map((g) => g.country)).toEqual(['England', 'Italy'])
    expect(groups[0].competitions.map((c) => c.name)).toEqual(['Championship', 'Premier League'])
    expect(groups[1].competitions.map((c) => c.name)).toEqual(['Serie A'])
  })

  it('uses Unknown when country is blank', () => {
    const groups = groupCompetitionsByCountry([comp({ id: 1, name: 'X', country: '  ' })])
    expect(groups[0].country).toBe('Unknown')
  })
})
