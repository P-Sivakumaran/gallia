import { describe, it, expect } from 'vitest'
import { dedupeKey } from './ledger.js'
import { movesFromSpells, validDate, type Spell } from './wikidataCareers.js'

const sp = (teamQid: string, teamName: string, start: string, opts: Partial<Spell> = {}): Spell => ({ teamQid, teamName, start: new Date(start), end: null, loan: false, ...opts })

describe('movesFromSpells', () => {
  it('turns club spells into moves, skipping youth, reserve and national teams', () => {
    const moves = movesFromSpells([
      sp('Q1', 'Arsenal F.C. Academy', '2008-07-01'),
      sp('Q2', 'England national under-21 football team', '2019-03-01'),
      sp('Q3', 'Arsenal F.C.', '2018-07-01'),
      sp('Q4', 'Real Madrid CF', '2025-07-01'),
    ])
    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ from: { teamQid: 'Q3' }, to: { teamQid: 'Q4' }, type: 'unknown' })
  })

  it('marks loans and the move back as a loan end', () => {
    const moves = movesFromSpells([
      sp('Q10', 'Chelsea F.C.', '2019-07-01'),
      sp('Q11', 'Brighton & Hove Albion F.C.', '2020-08-01', { loan: true }),
      sp('Q10', 'Chelsea F.C.', '2021-06-30'),
    ])
    expect(moves.map((m) => m.type)).toEqual(['loan', 'loan_end'])
  })

  it('takes "from" as the club the player was at, not a loan nested inside a long spell', () => {
    // Grealish: Villa 2012-2021 with a Notts County loan inside; then City; loan to Everton made permanent.
    const moves = movesFromSpells([
      sp('QV', 'Aston Villa F.C.', '2012-07-01', { end: new Date('2021-08-05') }),
      sp('QN', 'Notts County F.C.', '2013-09-01', { end: new Date('2014-01-01'), loan: true }),
      sp('QC', 'Manchester City F.C.', '2021-08-05', { end: new Date('2025-08-12') }),
      sp('QE', 'Everton F.C.', '2025-08-12', { end: new Date('2026-09-01'), loan: true }),
      sp('QE', 'Everton F.C.', '2026-09-01'),
    ])
    expect(moves.map((m) => `${m.from?.teamQid}->${m.to.teamQid}:${m.type}`)).toEqual(['QV->QN:loan', 'QV->QC:unknown', 'QC->QE:loan', 'QC->QE:unknown'])
  })

  it('ignores spells without a start date', () => {
    expect(movesFromSpells([sp('Q1', 'A FC', '2010-01-01'), { teamQid: 'Q2', teamName: 'B FC', start: null, end: null, loan: false }])).toEqual([])
  })
})

describe('dedupeKey', () => {
  it('is one key per player, destination and month whatever the source', () => {
    const a = dedupeKey({ playerId: 7, toClubId: 3, date: new Date('2026-07-01') })
    const b = dedupeKey({ playerId: 7, toClubId: 3, date: new Date('2026-07-15') })
    expect(a).toBe(b)
    expect(dedupeKey({ playerId: 7, toTeamQid: 'Q42', date: null })).toBe('7|qQ42|undated')
  })
})

describe('validDate', () => {
  it('drops unknown and out-of-range Wikidata dates', () => {
    expect(validDate('http://www.wikidata.org/.well-known/genid/abc')).toBeNull()
    expect(validDate('0001-01-01T00:00:00Z')).toBeNull()
    expect(validDate('2021-08-05T00:00:00Z')?.toISOString().slice(0, 10)).toBe('2021-08-05')
  })
})
