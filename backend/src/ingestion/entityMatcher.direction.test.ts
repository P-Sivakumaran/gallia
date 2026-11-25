import { describe, it, expect } from 'vitest'
import { resolveDirection } from './entityMatcher.js'

const strasbourg = { id: 1, name: 'RC Strasbourg', shortName: 'Strasbourg', league: 'Ligue 1' }
const ipswich = { id: 2, name: 'Ipswich Town', shortName: 'Ipswich', league: 'Championship' }
const clubs = [strasbourg, ipswich]
const mentioned = [
  { id: strasbourg.id, name: strasbourg.name, score: 1 },
  { id: ipswich.id, name: ipswich.name, score: 1 },
]

describe('resolveDirection — French cues (L’Équipe mercato feed)', () => {
  it('resolves "quitte X pour Y" the same way "leaves X for Y" resolves', () => {
    const text = 'Abdoul Ouattara quitte Strasbourg pour Ipswich'
    const result = resolveDirection(text.toLowerCase(), text, clubs, mentioned)
    expect(result.fromClub?.id).toBe(strasbourg.id)
    expect(result.toClub?.id).toBe(ipswich.id)
  })

  it('resolves the real fixture headline from rss.test.ts end to end', () => {
    const text = 'Mercato : comme Julio Enciso, Abdoul Ouattara quitte Strasbourg pour Ipswich'
    const result = resolveDirection(text.toLowerCase(), text, clubs, mentioned)
    expect(result.fromClub?.id).toBe(strasbourg.id)
    expect(result.toClub?.id).toBe(ipswich.id)
  })

  it('resolves a standalone "rejoint Y" as a TO cue', () => {
    const text = 'Ouattara rejoint Ipswich Town'
    const result = resolveDirection(text.toLowerCase(), text, clubs, mentioned)
    expect(result.toClub?.id).toBe(ipswich.id)
  })

  it('resolves a standalone "quitte X" as a FROM cue when there is no "pour Y"', () => {
    const text = 'Ouattara quitte Strasbourg cet été'
    const result = resolveDirection(text.toLowerCase(), text, clubs, mentioned)
    expect(result.fromClub?.id).toBe(strasbourg.id)
  })

  it('still resolves the original English "leaves X for Y" construction unchanged', () => {
    const text = 'Ouattara leaves Strasbourg for Ipswich'
    const result = resolveDirection(text.toLowerCase(), text, clubs, mentioned)
    expect(result.fromClub?.id).toBe(strasbourg.id)
    expect(result.toClub?.id).toBe(ipswich.id)
  })

  it('does not fabricate a direction when neither an English nor French cue is present', () => {
    const text = 'Strasbourg and Ipswich both interested in Ouattara'
    const result = resolveDirection(text.toLowerCase(), text, clubs, mentioned)
    expect(result.fromClub).toBeNull()
    expect(result.toClub).toBeNull()
  })
})

// Real headlines that produced reversed or wrong club directions (rumours
// 147, 156, 179, 194; found 2026-11-25).
describe('resolveDirection — buyer and reply cues', () => {
  const c = (id: number, name: string, shortName: string | null = null) => ({ id, name, shortName, league: 'x' })
  const city = c(10, 'Manchester City', 'Man City')
  const barca = c(11, 'FC Barcelona', 'Barcelona')
  const newcastle = c(12, 'Newcastle United', 'Newcastle')
  const arsenal = c(13, 'Arsenal')
  const gala = c(14, 'Galatasaray')
  const spurs = c(15, 'Tottenham Hotspur', 'Spurs')
  const m = (...cs: ReturnType<typeof c>[]) => cs.map((x) => ({ id: x.id, name: x.name, score: 1 }))
  const run = (text: string, cs: ReturnType<typeof c>[], current: number | null = null) =>
    resolveDirection(text.toLowerCase(), text, cs, m(...cs), current)

  it('treats "bid from X" as X buying (rumour 147)', () => {
    const r = run('Man City accept bid from Barcelona for World Cup-winning midfielder Rodri', [city, barca])
    expect(r.toClub?.id).toBe(barca.id)
    expect(r.fromClub?.id).toBe(city.id)
  })

  it('handles a fee before "bid from"', () => {
    const r = run('Man City reject £55m bid from Barcelona for Rodri', [city, barca])
    expect(r.toClub?.id).toBe(barca.id)
  })

  it('treats "reject first bid from X for captain" as X buying (rumour 179)', () => {
    const r = run('Newcastle reject first bid from Arsenal for captain Bruno Guimarães', [newcastle, arsenal])
    expect(r.fromClub?.id).toBe(newcastle.id)
    expect(r.toClub?.id).toBe(arsenal.id)
  })

  it('does not pair two suitors named together (rumour 194)', () => {
    const r = run('Cody Gakpo transfer decision amid interest from Spurs and Man City', [spurs, city])
    expect(r.fromClub).toBeNull()
    expect(r.toClub).toBeNull()
  })

  it('ignores "respond to X" as a destination (rumour 156)', () => {
    const r = run('Arsenal respond to Galatasaray warning over Victor Osimhen transfer', [arsenal, gala])
    expect(r.toClub).toBeNull()
  })

  it('uses the player\'s current club when no cue resolves (rumour 156)', () => {
    const r = run('Arsenal respond to Galatasaray warning over Victor Osimhen transfer', [arsenal, gala], gala.id)
    expect(r.fromClub?.id).toBe(gala.id)
    expect(r.toClub?.id).toBe(arsenal.id)
  })

  it('prefers the current club over an elimination-derived origin', () => {
    const r = run('Arsenal hold talks to sign Spurs and Galatasaray target', [arsenal, gala, spurs], gala.id)
    // No cue resolves here; with three clubs nothing is guessed.
    expect(r.fromClub).toBeNull()
  })

  it('keeps an explicit "from X" even when the stored current club differs', () => {
    const r = run('Arsenal sign Osimhen from Galatasaray', [arsenal, gala], arsenal.id)
    expect(r.fromClub?.id).toBe(gala.id)
  })
})

describe('resolveDirection — "to land" is a verb, not a destination', () => {
  it('reads "Milan to land Liverpool defender" with Liverpool as origin', () => {
    const milan = { id: 20, name: 'AC Milan', shortName: 'Milan', league: 'x' }
    const pool = { id: 21, name: 'Liverpool', shortName: null, league: 'x' }
    const text = 'Transfer rumors, news: Milan to land Liverpool defender Van Dijk?'
    const r = resolveDirection(text.toLowerCase(), text, [milan, pool], [
      { id: milan.id, name: milan.name, score: 1 },
      { id: pool.id, name: pool.name, score: 1 },
    ], pool.id)
    expect(r.fromClub?.id).toBe(pool.id)
    expect(r.toClub?.id).toBe(milan.id)
  })
})

describe('resolveDirection — "leaves X closer" is not a departure', () => {
  it('does not read Liverpool as the origin', () => {
    const psg = { id: 30, name: 'Paris Saint Germain', shortName: 'PSG', league: 'x' }
    const pool = { id: 31, name: 'Liverpool', shortName: null, league: 'x' }
    const text = "Fabrizio Romano's latest PSG here we go leaves Liverpool one step closer to Bradley Barcola"
    const r = resolveDirection(text.toLowerCase(), text, [psg, pool], [
      { id: psg.id, name: psg.name, score: 1 },
      { id: pool.id, name: pool.name, score: 1 },
    ], psg.id)
    expect(r.fromClub?.id).toBe(psg.id)
    expect(r.toClub?.id).toBe(pool.id)
  })

  it('still reads a real "leaves X for Y"', () => {
    const a = { id: 32, name: 'Ajax', shortName: null, league: 'x' }
    const b = { id: 33, name: 'Benfica', shortName: null, league: 'x' }
    const text = 'Striker leaves Ajax for Benfica'
    const r = resolveDirection(text.toLowerCase(), text, [a, b], [
      { id: a.id, name: a.name, score: 1 },
      { id: b.id, name: b.name, score: 1 },
    ])
    expect(r.fromClub?.id).toBe(a.id)
    expect(r.toClub?.id).toBe(b.id)
  })
})

describe('resolveDirection — current club fills both slots only on an approach', () => {
  const psg = { id: 40, name: 'Paris Saint Germain', shortName: 'PSG', league: 'x' }
  const ars = { id: 41, name: 'Arsenal', shortName: null, league: 'x' }
  const mm = [{ id: psg.id, name: psg.name, score: 1 }, { id: ars.id, name: ars.name, score: 1 }]
  it('no rumour from an injury story', () => {
    const t = 'Arsenal face fresh £80m transfer threat as PSG consider January response to Desire Doue injury'
    expect(resolveDirection(t.toLowerCase(), t, [psg, ars], mm, psg.id).toClub).toBeNull()
  })
  it('a rumour from "open talks with"', () => {
    const t = 'Arsenal open talks with PSG over Desire Doue'
    const r = resolveDirection(t.toLowerCase(), t, [psg, ars], mm, psg.id)
    expect(r.fromClub?.id).toBe(psg.id)
    expect(r.toClub?.id).toBe(ars.id)
  })
})
