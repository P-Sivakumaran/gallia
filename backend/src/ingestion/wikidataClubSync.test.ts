import { describe, expect, it } from 'vitest'
import {
  nameSimilarity,
  normaliseCountry,
  parsePoint,
  pickClub,
  scoreCandidate,
  searchTerms,
  type WikidataClub,
} from './wikidataClubSync.js'

const cand = (over: Partial<WikidataClub>): WikidataClub => ({
  qid: 'Q1', label: 'X', country: null, stadium: null, city: null, lat: 0, lng: 0, rank: 0, ...over,
})

describe('wikidata club matching', () => {
  it('maps our country names onto Wikidata labels', () => {
    expect(normaliseCountry('England')).toBe('united kingdom')
    expect(normaliseCountry('Türkiye')).toBe('turkey')
    expect(normaliseCountry('Unknown')).toBeNull()
    expect(normaliseCountry('International')).toBeNull()
    expect(normaliseCountry('Spain')).toBe('spain')
  })

  it('scores names after removing FC noise', () => {
    expect(nameSimilarity('Arsenal', 'Arsenal F.C.')).toBe(1)
    expect(nameSimilarity('Zimbru', 'FC Zimbru Chișinău')).toBe(0.85)
    expect(nameSimilarity('Chelsea', 'Chelsea Harbour')).toBe(0.85)
    expect(nameSimilarity('Celtic', 'Rangers F.C.')).toBe(0)
  })

  it('lets country break a tie between namesakes', () => {
    const club = { id: 1, name: 'Arsenal', country: 'England' }
    const english = scoreCandidate(club, cand({ qid: 'Q9617', label: 'Arsenal F.C.', country: 'United Kingdom', rank: 1 }))
    const other = scoreCandidate(club, cand({ qid: 'Q2', label: 'Arsenal de Sarandí', country: 'Argentina', rank: 0 }))
    expect(english).toBeGreaterThan(other)
  })

  it('applies a clear winner', () => {
    const r = pickClub({ id: 1, name: 'Celtic', country: 'Scotland' }, [
      cand({ qid: 'Q19593', label: 'Celtic F.C.', country: 'United Kingdom', rank: 0 }),
      cand({ qid: 'Q5', label: 'Celtic F.C. (women)', country: 'United Kingdom', rank: 3 }),
    ])
    expect(r.kind).toBe('matched')
    if (r.kind === 'matched') expect(r.candidate.qid).toBe('Q19593')
  })

  it('sends a weak or contested match to review instead of applying it', () => {
    const weak = pickClub({ id: 1, name: 'Sheriff', country: 'Moldova' }, [
      cand({ qid: 'Q9', label: 'Sheriff Wanderers', country: 'Zambia', rank: 4 }),
    ])
    expect(weak.kind).toBe('weak')

    const contested = pickClub({ id: 1, name: 'Universitatea', country: 'Romania' }, [
      cand({ qid: 'Qa', label: 'Universitatea Cluj', country: 'Romania', rank: 0 }),
      cand({ qid: 'Qb', label: 'Universitatea Craiova', country: 'Romania', rank: 0 }),
    ])
    expect(contested.kind).toBe('weak')
  })

  it('merges duplicate search hits, keeping the best rank', () => {
    const r = pickClub({ id: 1, name: 'Ajax', country: 'Netherlands' }, [
      cand({ qid: 'Q81888', label: 'AFC Ajax', country: 'Netherlands', rank: 4 }),
      cand({ qid: 'Q81888', label: 'AFC Ajax', country: 'Netherlands', rank: 0 }),
    ])
    expect(r.kind).toBe('matched')
  })

  it('returns none with no football-club candidates', () => {
    expect(pickClub({ id: 1, name: 'Nowhere', country: 'Spain' }, []).kind).toBe('none')
  })

  it('adds F.C. search forms only when the name lacks them', () => {
    expect(searchTerms('Chelsea')).toEqual(['Chelsea', 'Chelsea F.C.', 'FC Chelsea'])
    expect(searchTerms('FC Midtjylland')).toEqual(['FC Midtjylland'])
  })

  it('parses WKT points as lng lat', () => {
    expect(parsePoint('Point(-0.108611 51.555)')).toEqual({ lat: 51.555, lng: -0.108611 })
    expect(parsePoint('Point(200 10)')).toBeNull()
    expect(parsePoint('nonsense')).toBeNull()
  })

  it('drops women\'s, reserve and defunct namesakes that the label does not flag', () => {
    const palace = pickClub({ id: 1, name: 'Crystal Palace', country: 'England' }, [
      cand({ qid: 'Q19467', label: 'Crystal Palace F.C.', country: 'United Kingdom', rank: 0 }),
      cand({ qid: 'Q2494372', label: 'Crystal Palace F.C.', country: 'United Kingdom', rank: 1, dissolved: true }),
    ])
    expect(palace.kind).toBe('matched')
    const milan = pickClub({ id: 2, name: 'AC Milan', country: 'Italy' }, [
      cand({ qid: 'Q1543', label: 'AC Milan', country: 'Italy', rank: 0 }),
      cand({ qid: 'Q55602896', label: 'A.C. Milan', country: 'Italy', rank: 1, description: "women's section of Italian association football club" }),
    ])
    expect(milan.kind).toBe('matched')
    if (milan.kind === 'matched') expect(milan.candidate.qid).toBe('Q1543')
    const sheriff = pickClub({ id: 3, name: 'Sheriff', country: 'Moldova' }, [
      cand({ qid: 'Q210768', label: 'FC Sheriff Tiraspol', country: 'Moldova', rank: 0 }),
      cand({ qid: 'Q4523150', label: 'FC Sheriff-2 Tiraspol', country: 'Moldova', rank: 1 }),
    ])
    expect(sheriff.kind).toBe('matched')
  })
})
