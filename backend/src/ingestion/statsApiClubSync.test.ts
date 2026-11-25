import { describe, it, expect, vi } from 'vitest'
import {
  foldName,
  foldClubName,
  pickCandidate,
  runStatsApiClubSync,
  StatsApiRateLimited,
  type PlayerToSync,
  type StatsApiPlayer,
  type StatsSyncDb,
} from './statsApiClubSync.js'

// Fixtures are shaped on real TheStatsAPI search results (2026-11-25).
const hit = (name: string, age: number | null, team: string | null, id = name): StatsApiPlayer => ({
  id: `pl_${id}`,
  name,
  age,
  current_team: team ? { id: `tm_${team}`, name: team } : null,
})

const player = (name: string, age: number | null, clubs: string[]): PlayerToSync => ({
  id: 1,
  name,
  age,
  currentClubId: 10,
  knownClubs: clubs.map((c, i) => ({ id: 10 + i, name: c })),
})

describe('name folding', () => {
  it('ignores accents, case and punctuation', () => {
    expect(foldName('Vinícius Júnior')).toBe(foldName('Vinicius Junior'))
    expect(foldName('Ismaïla Sarr')).toBe('ismaila sarr')
  })

  it('matches club spellings across sources', () => {
    expect(foldClubName('AFC Ajax')).toBe(foldClubName('Ajax'))
    expect(foldClubName('Barcelona')).toBe(foldClubName('FC Barcelona'))
    expect(foldClubName('Paris Saint-Germain')).toBe(foldClubName('Paris Saint Germain'))
    expect(foldClubName('Atlético Madrid')).toBe(foldClubName('Atletico Madrid'))
    expect(foldClubName('Chelsea U21')).toBe(foldClubName('Chelsea'))
    expect(foldClubName('Aston Villa')).not.toBe(foldClubName('Villarreal'))
  })
})

describe('pickCandidate', () => {
  it('picks the namesake who is at one of the rumour clubs', () => {
    const r = pickCandidate(player('Cristian Romero', 26, ['Tottenham Hotspur', 'Atletico Madrid']), [
      hit('Cristian Romero', 28, 'Atlético Madrid', 'a'),
      hit('Cristian Romero', 21, 'Rayo Zuliano', 'b'),
      hit('Cristian Romero', 23, 'CD Cazalegas', 'c'),
    ])
    expect(r).toEqual({ kind: 'matched', candidate: expect.objectContaining({ id: 'pl_a' }) })
  })

  it('accepts a single-word name only when the player is at a rumour club', () => {
    const hits = [hit('Rodri', 30, 'Barcelona'), hit('Rodrigo Mora', 19, 'Roma')]
    expect(pickCandidate(player('Rodri', 28, ['Manchester City', 'FC Barcelona']), hits).kind).toBe('matched')
    expect(pickCandidate(player('Rodri', 28, ['Manchester City']), hits).kind).toBe('ambiguous')
  })

  it('never matches on a partial name', () => {
    const r = pickCandidate(player('Bruno', 32, ['Pafos FC', 'Galatasaray']), [
      hit('Bruno Fernandes', 32, 'Manchester United'),
      hit('Bruno Guimarães', 29, 'Arsenal'),
    ])
    expect(r.kind).toBe('unmatched')
  })

  it('skips common names it cannot narrow to one person', () => {
    const r = pickCandidate(player('Bruno Costa', 29, ['CFR Cluj']), [
      hit('Bruno Costa', 29, 'No team', 'a'),
      hit('Bruno Costa', 29, 'Suwon Samsung Bluewings', 'b'),
      hit('Bruno Costa', 36, 'No team', 'c'),
    ])
    expect(r.kind).toBe('ambiguous')
  })

  it('breaks a tie by age when exactly one namesake is within a year', () => {
    const r = pickCandidate(player('Jorge Padilla', 33, ['FC Santa Coloma']), [
      hit('Jorge Padilla', 33, "FC Rànger's", 'a'),
      hit('Jorge Padilla', 25, 'Cherno More Varna', 'b'),
    ])
    expect(r).toEqual({ kind: 'matched', candidate: expect.objectContaining({ id: 'pl_a' }) })
  })

  it('accepts a unique full name with slightly stale age, rejects a large age gap', () => {
    const hits = [hit('Victor Osimhen', 27, 'Galatasaray')]
    expect(pickCandidate(player('Victor Osimhen', 25, ['Arsenal']), hits).kind).toBe('matched')
    expect(pickCandidate(player('Victor Osimhen', 19, ['Arsenal']), hits).kind).toBe('unmatched')
  })
})

function fakeDb(rumours: any[], clubs: { id: number; name: string; externalId: string | null }[]) {
  let nextId = 100
  const db = {
    rumour: { findMany: vi.fn().mockResolvedValue(rumours) },
    club: {
      findFirst: vi.fn(async ({ where }: any) => clubs.find((c) => c.externalId === where.externalId) ?? null),
      findMany: vi.fn(async () => clubs),
      update: vi.fn(async ({ where, data }: any) => Object.assign(clubs.find((c) => c.id === where.id)!, data)),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: nextId++, name: data.name, externalId: data.externalId }
        clubs.push(row)
        return row
      }),
    },
    player: { update: vi.fn() },
  }
  return db as unknown as StatsSyncDb & typeof db
}

const club = (id: number, name: string, externalId: string | null = null) => ({ id, name, externalId })
const rumour = (p: any, from: any, to: any) => ({ player: { ...p, currentClub: from }, fromClub: from, toClub: to })
const noSleep = async () => {}

describe('runStatsApiClubSync', () => {
  it('moves a matched player to the rumoured club and adopts its row', async () => {
    const spurs = club(1, 'Tottenham Hotspur', 'TOT')
    const atleti = club(2, 'Atletico Madrid')
    const db = fakeDb(
      [rumour({ id: 7, name: 'Cristian Romero', age: 26, currentClubId: 1 }, spurs, atleti)],
      [spurs, atleti],
    )
    const search = vi.fn().mockResolvedValue([hit('Cristian Romero', 28, 'Atlético Madrid')])

    const s = await runStatsApiClubSync(db, search, noSleep)

    expect(s).toMatchObject({ checked: 1, updated: 1 })
    expect(db.player.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { currentClubId: 2 } })
    expect(atleti.externalId).toBe('tsa-team-tm_Atlético Madrid')
    expect(db.club.create).not.toHaveBeenCalled()
  })

  it('does not overwrite another source\'s club id when adopting by name', async () => {
    const city = club(1, 'Manchester City', 'MCI')
    const barca = club(2, 'FC Barcelona', 'FCB')
    const db = fakeDb([rumour({ id: 8, name: 'Rodri', age: 28, currentClubId: 1 }, city, barca)], [city, barca])
    await runStatsApiClubSync(db, vi.fn().mockResolvedValue([hit('Rodri', 30, 'Barcelona')]), noSleep)
    expect(barca.externalId).toBe('FCB')
    expect(db.player.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { currentClubId: 2 } })
  })

  it('leaves free agents and unmatched players untouched', async () => {
    const monaco = club(1, 'Monaco')
    const db = fakeDb(
      [
        rumour({ id: 1, name: 'Paul Pogba', age: 33, currentClubId: 1 }, monaco, null),
        rumour({ id: 2, name: 'Evgeniy Berezkin', age: 30, currentClubId: 1 }, monaco, null),
      ],
      [monaco],
    )
    const search = vi.fn(async (n: string) => (n === 'Paul Pogba' ? [hit('Paul Pogba', 33, 'No team')] : []))
    const s = await runStatsApiClubSync(db, search, noSleep)
    expect(s).toMatchObject({ checked: 2, noTeam: 1, unmatched: 1, updated: 0 })
    expect(db.player.update).not.toHaveBeenCalled()
  })

  it('creates an auto club for a move outside known clubs', async () => {
    const celtic = club(1, 'Celtic')
    const db = fakeDb([rumour({ id: 3, name: 'Arne Engels', age: 23, currentClubId: 1 }, celtic, null)], [celtic])
    const s = await runStatsApiClubSync(db, vi.fn().mockResolvedValue([hit('Arne Engels', 23, 'West Ham United')]), noSleep)
    expect(s.updated).toBe(1)
    expect(db.club.create).toHaveBeenCalledWith({
      data: { externalId: 'tsa-team-tm_West Ham United', name: 'West Ham United', autoCreated: true },
    })
  })

  it('stops on a 429 and keeps going past other errors', async () => {
    const c = club(1, 'Ajax')
    const db = fakeDb(
      [
        rumour({ id: 1, name: 'A One', age: null, currentClubId: 1 }, c, null),
        rumour({ id: 2, name: 'B Two', age: null, currentClubId: 1 }, c, null),
        rumour({ id: 3, name: 'C Three', age: null, currentClubId: 1 }, c, null),
      ],
      [c],
    )
    const search = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 500'))
      .mockRejectedValueOnce(new StatsApiRateLimited('429'))
    const s = await runStatsApiClubSync(db, search, noSleep)
    expect(s).toMatchObject({ checked: 2, errors: 1, rateLimited: true })
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('checks each player once across several rumours', async () => {
    const a = club(1, 'Ajax')
    const p = { id: 5, name: 'Mika Godts', age: 21, currentClubId: 1 }
    const db = fakeDb([rumour(p, a, club(2, 'Paris Saint Germain')), rumour(p, a, club(3, 'Arsenal'))], [a])
    const search = vi.fn().mockResolvedValue([])
    await runStatsApiClubSync(db, search, noSleep)
    expect(search).toHaveBeenCalledTimes(1)
  })
})
