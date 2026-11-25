/**
 * Wikidata club sync: places clubs on the map.
 *
 * For each club without coordinates, search Wikidata, keep candidates that are
 * football clubs, score them by name and country, and, when one wins clearly,
 * write its coordinates, stadium and city to the club. Every value read is kept
 * as a SourcedFact (licence CC0) whether or not it was applied, so a weak or
 * contested match can be reviewed instead of silently overwriting data.
 *
 * Coordinates come from the club's home venue (P115 → P625), falling back to
 * its headquarters (P159 → P625), then its city (P131 → P625).
 */
import type { PrismaClient } from '@prisma/client'
import { foldClubName, foldName } from './statsApiClubSync.js'

const USER_AGENT = 'GalliaClubSync/1.0 (football transfer research)'
const SEARCH_URL = 'https://www.wikidata.org/w/api.php'
const SPARQL_URL = 'https://query.wikidata.org/sparql'

/** Apply a match at or above this confidence, if it also beats the runner-up by MIN_MARGIN. */
export const APPLY_THRESHOLD = 0.75
export const MIN_MARGIN = 0.08
/** Don't re-check a club the sync already looked at within this window. */
const RECHECK_DAYS = 30
const DETAIL_BATCH = 40

export interface WikidataClub {
  qid: string
  label: string
  country: string | null
  stadium: string | null
  city: string | null
  lat: number
  lng: number
  /** English description, which often says "women's section" or "reserve team" when the label doesn't */
  description?: string | null
  /** The item has a dissolution date (P576): a defunct club */
  dissolved?: boolean
  /** Position of this item in the search results it came from (0 = top). */
  rank: number
}

export interface ClubToPlace {
  id: number
  name: string
  country: string
}

// Our country names → Wikidata's country label, folded.
const COUNTRY_ALIASES: Record<string, string> = {
  england: 'united kingdom',
  scotland: 'united kingdom',
  wales: 'united kingdom',
  'northern ireland': 'united kingdom',
  turkiye: 'turkey',
  czechia: 'czech republic',
  'kingdom of the netherlands': 'netherlands',
}

export function normaliseCountry(country: string | null | undefined): string | null {
  if (!country) return null
  const f = foldName(country)
  if (!f || f === 'unknown' || f === 'international') return null
  return COUNTRY_ALIASES[f] ?? f
}

const SIDE_TEAM = /\b(women|womens|ladies|feminin[oa]?|femenin[oa]?|frauen|dames|youth|academy|reserves?|u\d{2}|under \d{2}|ii|iii|b|[2-9])\b/

/** True when the item is a women's, youth, reserve or second team rather than the senior side. */
export function isSideTeam(label: string, description?: string | null): boolean {
  return SIDE_TEAM.test(foldClubName(label.replace(/\./g, ''))) || SIDE_TEAM.test(foldName(description ?? ''))
}

/** 0–1 similarity between two club names after removing FC/AFC/CF noise. */
export function nameSimilarity(a: string, b: string): number {
  // "F.C." → "FC" before folding, so it is dropped as noise like "FC".
  const x = foldClubName(a.replace(/\./g, ''))
  const y = foldClubName(b.replace(/\./g, ''))
  if (!x || !y) return 0
  if (x === y) return 1
  // A women's, youth or reserve side is a different club from the senior men's team.
  if (SIDE_TEAM.test(y) !== SIDE_TEAM.test(x)) return 0.3
  if (x.includes(y) || y.includes(x)) return 0.85
  const tx = new Set(x.split(' '))
  const ty = new Set(y.split(' '))
  const shared = [...tx].filter((t) => ty.has(t)).length
  return shared / new Set([...tx, ...ty]).size
}

/**
 * Confidence that a Wikidata item is this club: mostly name, then country,
 * with a small bonus for being the search engine's top hit.
 */
export function scoreCandidate(club: ClubToPlace, cand: WikidataClub): number {
  let name = nameSimilarity(club.name, cand.label)
  if (isSideTeam(cand.label, cand.description) && !isSideTeam(club.name)) name = Math.min(name, 0.3)
  if (cand.dissolved) name *= 0.5
  const ours = normaliseCountry(club.country)
  const theirs = normaliseCountry(cand.country)
  // Unknown country on our side is neutral; a clear mismatch is a strong signal against.
  const country = !ours || !theirs ? 0.5 : ours === theirs ? 1 : 0
  const rank = cand.rank === 0 ? 1 : cand.rank <= 2 ? 0.5 : 0
  return Math.round((0.6 * name + 0.3 * country + 0.1 * rank) * 1000) / 1000
}

export type PickResult =
  | { kind: 'matched'; candidate: WikidataClub; confidence: number }
  | { kind: 'weak'; candidate: WikidataClub; confidence: number; reason: string }
  | { kind: 'none' }

export function pickClub(club: ClubToPlace, candidates: WikidataClub[]): PickResult {
  // The same item can come back from several searches; keep its best rank.
  const byQid = new Map<string, WikidataClub>()
  for (const c of candidates) {
    const seen = byQid.get(c.qid)
    if (!seen || c.rank < seen.rank) byQid.set(c.qid, c)
  }
  const scored = [...byQid.values()]
    .map((c) => ({ c, s: scoreCandidate(club, c) }))
    .sort((a, b) => b.s - a.s)
  if (!scored.length) return { kind: 'none' }
  const [best, second] = scored
  if (best.s < APPLY_THRESHOLD) {
    return { kind: 'weak', candidate: best.c, confidence: best.s, reason: `confidence ${best.s} below ${APPLY_THRESHOLD}` }
  }
  if (second && best.s - second.s < MIN_MARGIN) {
    return { kind: 'weak', candidate: best.c, confidence: best.s, reason: `close runner-up ${second.c.qid} (${second.s})` }
  }
  return { kind: 'matched', candidate: best.c, confidence: best.s }
}

/** Search terms for one club: the name as stored, plus the common "F.C." forms. */
export function searchTerms(name: string): string[] {
  const base = name.trim()
  const terms = [base]
  if (!/\b(f\.?c\.?|a\.?f\.?c\.?|c\.?f\.?)\b/i.test(base)) terms.push(`${base} F.C.`, `FC ${base}`)
  return terms
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

async function fetchJson(fetcher: Fetch, url: string, init: RequestInit, sleep: (ms: number) => Promise<void>): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response
    try {
      res = await fetcher(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json, application/json', ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(60_000),
      })
    } catch (err) {
      if ((err as Error).name !== 'TimeoutError' || attempt === 3) throw err
      await sleep(5000 * (attempt + 1))
      continue
    }
    if (res.status === 429 || res.status === 503) {
      const wait = Number(res.headers.get('retry-after')) || 10 * (attempt + 1)
      await sleep(wait * 1000)
      continue
    }
    if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`)
    return res.json()
  }
  throw new Error('Wikidata kept rate-limiting')
}

export async function searchQids(fetcher: Fetch, term: string, sleep: (ms: number) => Promise<void>): Promise<string[]> {
  const url = `${SEARCH_URL}?${new URLSearchParams({ action: 'wbsearchentities', search: term, language: 'en', type: 'item', limit: '7', format: 'json' })}`
  const data = (await fetchJson(fetcher, url, {}, sleep)) as { search?: { id: string }[] }
  return (data.search ?? []).map((s) => s.id)
}

interface SparqlRow {
  c: { value: string }
  cLabel?: { value: string }
  countryLabel?: { value: string }
  venueLabel?: { value: string }
  cityLabel?: { value: string }
  coord?: { value: string }
  desc?: { value: string }
  dissolved?: { value: string }
}

/** Parse a WKT "Point(lng lat)" literal. */
export function parsePoint(wkt: string): { lat: number; lng: number } | null {
  const m = wkt.match(/Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i)
  if (!m) return null
  const lng = Number(m[1])
  const lat = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

/** Football-club details for a set of items; non-clubs and items without a location are dropped. */
export async function fetchClubDetails(
  fetcher: Fetch,
  qids: string[],
  sleep: (ms: number) => Promise<void>,
  onError: (err: Error) => void = (err) => { throw err },
): Promise<Map<string, Omit<WikidataClub, 'rank'>>> {
  const out = new Map<string, Omit<WikidataClub, 'rank'>>()
  // Small batches: the subclass path (P279*) makes big VALUES lists time out.
  for (let i = 0; i < qids.length; i += DETAIL_BATCH) {
    const values = qids.slice(i, i + DETAIL_BATCH).map((q) => `wd:${q}`).join(' ')
    const query = `SELECT ?c ?cLabel ?countryLabel ?venueLabel ?cityLabel ?coord ?desc ?dissolved WHERE {
  VALUES ?c { ${values} }
  ?c wdt:P31/wdt:P279* wd:Q476028 .
  OPTIONAL { ?c wdt:P17 ?country }
  OPTIONAL { ?c wdt:P115 ?venue . OPTIONAL { ?venue wdt:P625 ?vc } }
  OPTIONAL { ?c wdt:P159 ?hq . ?hq wdt:P625 ?hc }
  OPTIONAL { ?c wdt:P131 ?city . OPTIONAL { ?city wdt:P625 ?cc } }
  OPTIONAL { ?c schema:description ?desc . FILTER(lang(?desc) = "en") }
  OPTIONAL { ?c wdt:P576 ?dissolved }
  BIND(COALESCE(?vc, ?hc, ?cc) AS ?coord)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`
    let data: { results: { bindings: SparqlRow[] } }
    try {
      data = (await fetchJson(fetcher, SPARQL_URL, {
        method: 'POST',
        body: new URLSearchParams({ query, format: 'json' }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, sleep)) as typeof data
    } catch (err) {
      onError(err as Error)
      continue
    }
    await sleep(1000)
    for (const row of data.results.bindings) {
      const qid = row.c.value.split('/').pop()!
      const point = row.coord ? parsePoint(row.coord.value) : null
      if (!point || out.has(qid)) continue
      // An unlabelled venue comes back as its bare QID; that isn't a name.
      const label = (v?: { value: string }) => (v && !/^Q\d+$/.test(v.value) ? v.value : null)
      out.set(qid, {
        qid,
        label: row.cLabel?.value ?? qid,
        country: label(row.countryLabel),
        stadium: label(row.venueLabel),
        city: label(row.cityLabel),
        description: row.desc?.value ?? null,
        dissolved: Boolean(row.dissolved),
        ...point,
      })
    }
  }
  return out
}

export interface ClubSyncSummary {
  checked: number
  placed: number
  weak: number
  none: number
  conflicts: number
  errors: number
}

type ClubSyncDb = Pick<PrismaClient, 'club' | 'sourcedFact' | '$transaction'>

export async function clubsToPlace(db: ClubSyncDb, limit: number): Promise<ClubToPlace[]> {
  const cutoff = new Date(Date.now() - RECHECK_DAYS * 86_400_000)
  return db.club.findMany({
    where: {
      isPlaceholder: false,
      lat: null,
      OR: [{ geoCheckedAt: null }, { geoCheckedAt: { lt: cutoff } }],
    },
    select: { id: true, name: true, country: true },
    orderBy: { id: 'asc' },
    take: limit,
  })
}

export async function runWikidataClubSync(
  db: ClubSyncDb,
  opts: { limit?: number; fetcher?: Fetch; sleep?: (ms: number) => Promise<void>; log?: (msg: string) => void } = {},
): Promise<ClubSyncSummary> {
  const fetcher = opts.fetcher ?? fetch
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const log = opts.log ?? (() => {})
  const summary: ClubSyncSummary = { checked: 0, placed: 0, weak: 0, none: 0, conflicts: 0, errors: 0 }

  const clubs = await clubsToPlace(db, opts.limit ?? 500)
  const ranked = new Map<number, { qid: string; rank: number }[]>()
  for (const club of clubs) {
    const hits: { qid: string; rank: number }[] = []
    try {
      for (const term of searchTerms(club.name)) {
        ;(await searchQids(fetcher, term, sleep)).forEach((qid, rank) => hits.push({ qid, rank }))
        await sleep(300)
      }
    } catch (err) {
      summary.errors++
      log(`search failed for "${club.name}": ${(err as Error).message}`)
    }
    ranked.set(club.id, hits)
  }

  const allQids = [...new Set([...ranked.values()].flat().map((h) => h.qid))]
  let detailFailures = 0
  const details = await fetchClubDetails(fetcher, allQids, sleep, (err) => {
    detailFailures++
    summary.errors++
    log(`detail batch failed: ${err.message}`)
  })
  // Don't stamp clubs as checked when their candidates may be in a failed batch.
  const stampChecked = detailFailures === 0
  const taken = new Set(
    (await db.club.findMany({ where: { wikidataId: { not: null } }, select: { wikidataId: true } })).map((c) => c.wikidataId!),
  )

  for (const club of clubs) {
    summary.checked++
    const candidates = (ranked.get(club.id) ?? []).flatMap((h) => {
      const d = details.get(h.qid)
      return d ? [{ ...d, rank: h.rank }] : []
    })
    const pick = pickClub(club, candidates)
    const now = new Date()

    if (pick.kind === 'none') {
      summary.none++
      if (stampChecked) await db.club.update({ where: { id: club.id }, data: { geoCheckedAt: now } })
      log(`no match: ${club.name}`)
      continue
    }

    const c = pick.candidate
    const conflict = pick.kind === 'matched' && taken.has(c.qid)
    const apply = pick.kind === 'matched' && !conflict
    const facts = [
      ['wikidataId', c.qid],
      ['lat', String(c.lat)],
      ['lng', String(c.lng)],
      ...(c.stadium ? [['stadium', c.stadium]] : []),
      ...(c.city ? [['city', c.city]] : []),
    ].map(([field, value]) => ({
      entityType: 'CLUB',
      entityId: club.id,
      field,
      value,
      source: 'wikidata',
      sourceUrl: `https://www.wikidata.org/wiki/${c.qid}`,
      licence: 'CC0',
      confidence: pick.confidence,
      applied: apply,
    }))

    await db.$transaction([
      // A rerun replaces this club's earlier unapplied Wikidata reading instead of piling up
      // duplicates. Applied facts and other sources' facts are left alone.
      db.sourcedFact.updateMany({
        where: { entityType: 'CLUB', entityId: club.id, source: 'wikidata', applied: false, supersededAt: null },
        data: { supersededAt: now },
      }),
      db.sourcedFact.createMany({ data: facts }),
      db.club.update({
        where: { id: club.id },
        data: apply
          ? { wikidataId: c.qid, lat: c.lat, lng: c.lng, stadium: c.stadium, city: c.city, geoCheckedAt: now }
          : { geoCheckedAt: now },
      }),
    ])

    if (apply) {
      taken.add(c.qid)
      summary.placed++
      log(`placed: ${club.name} → ${c.label} (${c.qid}) ${pick.confidence}`)
    } else if (conflict) {
      summary.conflicts++
      log(`conflict: ${club.name} → ${c.qid} already belongs to another club`)
    } else {
      summary.weak++
      log(`review: ${club.name} → ${c.label} (${c.qid}) ${pick.kind === 'weak' ? pick.reason : ''}`)
    }
  }
  return summary
}
