import { describe, it, expect } from 'vitest'
import { foldName } from '../ingestion/statsApiClubSync.js'
import { matchSquadPlayer, positionGroup, type GalliaPlayerLite, type TsaSquadPlayer } from './sync.js'

const sp = (over: Partial<TsaSquadPlayer> = {}): TsaSquadPlayer => ({
  id: 'pl_1', name: 'Ben White', position: 'D', date_of_birth: '1997-10-08', age: 29, nationality: 'England',
  height_cm: 186, preferred_foot: 'right', current_team: { id: 'tm_9145', name: 'Arsenal', jersey_number: 4 }, ...over,
})

function index(players: GalliaPlayerLite[]) {
  const byTsaId = new Map(players.filter((p) => p.tsaPlayerId).map((p) => [p.tsaPlayerId!, p]))
  const byName = new Map<string, GalliaPlayerLite[]>()
  for (const p of players) byName.set(foldName(p.name), [...(byName.get(foldName(p.name)) ?? []), p])
  return { byTsaId, byName }
}

describe('positionGroup', () => {
  it('maps G/D/M/F and leaves unknown codes empty', () => {
    expect(['G', 'D', 'M', 'F', 'X', null].map(positionGroup)).toEqual(['GK', 'DEF', 'MID', 'FWD', null, null])
  })
})

describe('matchSquadPlayer', () => {
  const ARSENAL = 10

  it('uses an existing link first', () => {
    const { byTsaId, byName } = index([{ id: 5, name: 'Somebody Else', age: 29, currentClubId: 1, tsaPlayerId: 'pl_1' }])
    expect(matchSquadPlayer(sp(), ARSENAL, byTsaId, byName)).toEqual({ kind: 'linked', playerId: 5 })
  })

  it('matches the namesake at the same club', () => {
    const { byTsaId, byName } = index([
      { id: 1, name: 'Ben White', age: 29, currentClubId: ARSENAL, tsaPlayerId: null },
      { id: 2, name: 'Ben White', age: 21, currentClubId: 99, tsaPlayerId: null },
    ])
    expect(matchSquadPlayer(sp(), ARSENAL, byTsaId, byName)).toEqual({ kind: 'matched', playerId: 1 })
  })

  it('matches a unique namesake elsewhere only within the age tolerance', () => {
    const near = index([{ id: 3, name: 'Ben White', age: 28, currentClubId: 99, tsaPlayerId: null }])
    expect(matchSquadPlayer(sp(), ARSENAL, near.byTsaId, near.byName)).toEqual({ kind: 'matched', playerId: 3 })
    const far = index([{ id: 4, name: 'Ben White', age: 19, currentClubId: 99, tsaPlayerId: null }])
    expect(matchSquadPlayer(sp(), ARSENAL, far.byTsaId, far.byName)).toEqual({ kind: 'new' })
  })

  it('sends a one-word name or a nationality clash at another club to review', () => {
    const mono = index([{ id: 8, name: 'Wesley', age: 23, currentClubId: 99, tsaPlayerId: null }])
    expect(matchSquadPlayer(sp({ name: 'Wesley', age: 23 }), ARSENAL, mono.byTsaId, mono.byName)).toEqual({ kind: 'ambiguous', candidateIds: [8] })
    const clash = index([{ id: 9, name: 'Ben White', age: 29, currentClubId: 99, tsaPlayerId: null, nationality: 'Wales' }])
    expect(matchSquadPlayer(sp(), ARSENAL, clash.byTsaId, clash.byName)).toEqual({ kind: 'ambiguous', candidateIds: [9] })
  })

  it('never guesses between two namesakes elsewhere', () => {
    const { byTsaId, byName } = index([
      { id: 6, name: 'Ben White', age: 29, currentClubId: 98, tsaPlayerId: null },
      { id: 7, name: 'Ben White', age: 30, currentClubId: 99, tsaPlayerId: null },
    ])
    expect(matchSquadPlayer(sp(), ARSENAL, byTsaId, byName)).toEqual({ kind: 'ambiguous', candidateIds: [6, 7] })
  })

  it('creates a new player when nobody has the name', () => {
    const { byTsaId, byName } = index([])
    expect(matchSquadPlayer(sp(), ARSENAL, byTsaId, byName)).toEqual({ kind: 'new' })
  })
})
