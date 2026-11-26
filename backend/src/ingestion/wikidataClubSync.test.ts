import { describe, expect, it } from 'vitest'
import {
  nameSimilarity,
  matchFold,
  bestNameSimilarity,
  normaliseCountry,
  parsePoint,
  pickClub,
  scoreCandidate,
  runWikidataClubSync,
  backfillReviewLabels,
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

describe('runWikidataClubSync reruns', () => {
  // In-memory stand-in for the two tables the sync touches.
  function fakeDb(clubs: { id: number; name: string; country: string; lat: number | null }[]) {
    const facts: { entityId: number; source: string; applied: boolean; supersededAt: Date | null; field: string; value?: string; sourceUrl?: string | null; confidence?: number }[] = []
    const db = {
      club: {
        findMany: async (args: { where?: { wikidataId?: unknown } }) =>
          args.where && 'wikidataId' in args.where ? [] : clubs.filter((c) => c.lat == null),
        update: async ({ where, data }: { where: { id: number }; data: { lat?: number } }) => {
          const c = clubs.find((x) => x.id === where.id)!
          if (data.lat != null) c.lat = data.lat
          return c
        },
      },
      sourcedFact: {
        findMany: async ({ where }: { where: { field: string } }) =>
          facts.filter((f) => f.field === where.field && !f.applied && !f.supersededAt),
        updateMany: async ({ where, data }: { where: { entityId: number }; data: { supersededAt: Date } }) => {
          for (const f of facts) if (f.entityId === where.entityId && !f.applied && !f.supersededAt) f.supersededAt = data.supersededAt
          return { count: 0 }
        },
        createMany: async ({ data }: { data: typeof facts }) => {
          facts.push(...data.map((d) => ({ ...d, supersededAt: null })))
          return { count: data.length }
        },
      },
      $transaction: async (ops: Promise<unknown>[]) => {
        for (const op of ops) await op
        return []
      },
    }
    return { db: db as never, facts, clubs }
  }

  it('backfills names for review rows that only have a QID', async () => {
    const { db, facts } = fakeDb([])
    facts.push({ entityId: 7, source: 'wikidata', applied: false, supersededAt: null, field: 'wikidataId', value: 'Q210768', sourceUrl: 'https://www.wikidata.org/wiki/Q210768', confidence: 0.7 })
    const labels = async () => new Response(JSON.stringify({ entities: { Q210768: { labels: { en: { value: 'FC Sheriff Tiraspol' } } } } }), { status: 200 })
    expect(await backfillReviewLabels(db, labels as never, async () => {})).toBe(1)
    expect(facts.find((f) => f.field === 'label')).toMatchObject({ entityId: 7, value: 'FC Sheriff Tiraspol', applied: false })
    // A second pass finds nothing left to fill.
    expect(await backfillReviewLabels(db, labels as never, async () => {})).toBe(0)
  })

  // Search returns one weak candidate; SPARQL describes it as a Zambian club named differently.
  const fetcher = async (url: string) => {
    const body = url.includes('wbgetentities')
      ? { entities: {} }
      : url.includes('wbsearchentities')
      ? { search: [{ id: 'Q9' }] }
      : { results: { bindings: [{ c: { value: 'http://www.wikidata.org/entity/Q9' }, cLabel: { value: 'Sheriff Wanderers' }, countryLabel: { value: 'Zambia' }, coord: { value: 'Point(28 -15)' } }] } }
    return new Response(JSON.stringify(body), { status: 200 })
  }

  it('supersedes the previous unapplied reading instead of duplicating it, and never moves the club', async () => {
    const { db, facts, clubs } = fakeDb([{ id: 1, name: 'Sheriff', country: 'Moldova', lat: null }])
    const opts = { fetcher: fetcher as never, sleep: async () => {} }
    await runWikidataClubSync(db, opts)
    await runWikidataClubSync(db, opts)
    const live = facts.filter((f) => !f.supersededAt)
    expect(new Set(live.map((f) => f.field)).size).toBe(live.length)
    expect(facts.length).toBe(live.length * 2)
    expect(clubs[0].lat).toBeNull()
  })
})

describe('matcher: aliases, word boundaries, club-form tokens', () => {
  it('folds club-form tokens, slashes and letters NFD keeps', () => {
    expect(matchFold('FK Bodø/Glimt')).toBe('bodo glimt')
    expect(matchFold('Bodø / Glimt')).toBe('bodo glimt')
    expect(matchFold('HNK Rijeka')).toBe('rijeka')
    expect(matchFold('Ħamrun Spartans F.C.')).toBe('hamrun spartans')
    expect(matchFold('FCSB')).toBe('fcsb')
    expect(matchFold("St Joseph's F.C.")).toBe(matchFold('St Josephs FC'))
  })

  it('matches whole words only', () => {
    expect(nameSimilarity('KÍ', 'FC Kiisto')).toBe(0)
    expect(nameSimilarity('Auda', 'Audax Italiano')).toBe(0)
    expect(nameSimilarity('Rijeka', 'HNK Rijeka')).toBe(1)
    expect(nameSimilarity('Virtus', 'Virtus Entella')).toBe(0.85)
  })

  it('uses other-language labels and aliases', () => {
    const sparta = { label: 'AC Sparta Prague', names: ['AC Sparta Praha', 'Sparta Prag'] }
    expect(nameSimilarity('Sparta Praha', sparta.label)).toBeLessThan(0.85)
    expect(bestNameSimilarity('Sparta Praha', sparta)).toBe(1)
    expect(bestNameSimilarity('Hearts', { label: 'Heart of Midlothian F.C.', names: ['Hearts'] })).toBe(1)
  })

  it('treats Republic of Ireland as Ireland', () => {
    expect(normaliseCountry('Republic of Ireland')).toBe('ireland')
    expect(normaliseCountry('Gibraltar')).toBe('united kingdom')
    const club = { id: 1, name: 'Shamrock Rovers', country: 'Republic of Ireland' }
    expect(pickClub(club, [cand({ qid: 'Q1', label: 'Shamrock Rovers F.C.', country: 'Ireland', rank: 0 })]).kind).toBe('matched')
  })
})
