import { describe, it, expect } from 'vitest'
import { SportmonksSquadMemberSchema, targetLeagues } from './sportmonksCatalog.js'

const BASE_MEMBER = {
  player_id: 1,
  position_id: 1,
  detailed_position_id: 1,
  player: {
    id: 1,
    display_name: 'Test Player',
    date_of_birth: '2000-01-01',
    image_path: null,
    nationality: null,
  },
}

describe('SportmonksSquadMemberSchema', () => {
  it('accepts an explicit end date', () => {
    const parsed = SportmonksSquadMemberSchema.parse({ ...BASE_MEMBER, end: '2028-06-30' })
    expect(parsed.end).toBe('2028-06-30')
  })

  it('accepts an explicit null end', () => {
    const parsed = SportmonksSquadMemberSchema.parse({ ...BASE_MEMBER, end: null })
    expect(parsed.end).toBeNull()
  })

  it('accepts a squad member with the end key omitted entirely (e.g. trialist/youth/loan rows)', () => {
    const parsed = SportmonksSquadMemberSchema.parse({ ...BASE_MEMBER })
    expect(parsed.end).toBeUndefined()
  })
})

describe('targetLeagues', () => {
  it('defaults to the four UEFA club competitions when unset or blank', () => {
    expect(Object.keys(targetLeagues(undefined))).toEqual(['2', '5', '1328', '2286'])
    expect(targetLeagues('  ')).toEqual(targetLeagues(undefined))
  })

  it('parses "id:Name" pairs and skips malformed entries', () => {
    expect(targetLeagues('8:Premier League, 564:La Liga,bad,x:Nope,9:')).toEqual({
      '8': 'Premier League',
      '564': 'La Liga',
    })
  })

  it('falls back to defaults when no entry is valid', () => {
    expect(targetLeagues('nonsense')).toEqual(targetLeagues(undefined))
  })
})
