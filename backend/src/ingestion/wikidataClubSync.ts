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
const SEARCH_PAUSE_MS = 1000

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
  /** Labels in every language plus aliases ("Sparta Praha", "FC København", "Hearts"). */
  names?: string[]
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
  // British Overseas Territory: Wikidata gives its clubs country = United Kingdom.
  gibraltar: 'united kingdom',
  'republic of ireland': 'ireland',
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

// Letters NFD doesn't decompose, so "Bodø" and "Bodo" fold the same.
const LETTERS: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', đ: 'd', ł: 'l', ħ: 'h', ı: 'i', þ: 'th', ð: 'd' }
// Club-form prefixes and suffixes in the languages UEFA clubs use (FK, HNK, KF, PFC...).
const MATCH_NOISE = new Set([
  'fc', 'afc', 'cf', 'fk', 'sk', 'nk', 'hnk', 'kf', 'ks', 'pfc', 'ss', 'sc', 'ac', 'as', 'cd', 'ud', 'sd', 'bk', 'ik', 'if',
  'sv', 'fsv', 'tsv', 'vfb', 'vfl', 'rcd', 'gnk', 'pfk', 'mfk', 'ofk', 'sfc', 'jk', 'fcsb', 'club', 'football', 'futbol', 'futebol', 'calcio',
])

/** Fold a club name for matching: accents and punctuation (including "/") gone, club-form tokens dropped. */
export function matchFold(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[øæœßđłħıþð]/g, (ch) => LETTERS[ch] ?? ch)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[.'’`]/g, '')
  const tokens = base.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const kept = tokens.filter((t) => !MATCH_NOISE.has(t) && !/^u\d{2}$/.test(t))
  // A name that is only noise ("FCSB") keeps its tokens.
  return (kept.length ? kept : tokens).join(' ')
}

/** 0–1 similarity between two club names after removing FC/FK/HNK-style noise. */
export function nameSimilarity(a: string, b: string): number {
  const x = matchFold(a)
  const y = matchFold(b)
  if (!x || !y) return 0
  if (x === y) return 1
  // A women's, youth or reserve side is a different club from the senior men's team.
  if (SIDE_TEAM.test(y) !== SIDE_TEAM.test(x)) return 0.3
  const tx = new Set(x.split(' '))
  const ty = new Set(y.split(' '))
  // Whole words only: "Auda" is not "Audax", "KÍ" is not "Kiisto".
  const shared = [...tx].filter((t) => ty.has(t)).length
  if (shared === Math.min(tx.size, ty.size)) return 0.85
  return shared / new Set([...tx, ...ty]).size
}

/** Best similarity against the item's label and all its other names. */
export function bestNameSimilarity(ours: string, cand: Pick<WikidataClub, 'label' | 'names'>): number {
  let best = nameSimilarity(ours, cand.label)
  for (const n of cand.names ?? []) {
    if (best === 1) break
    best = Math.max(best, nameSimilarity(ours, n))
  }
  return best
}

/**
 * Confidence that a Wikidata item is this club: mostly name, then country,
 * with a small bonus for being the search engine's top hit.
 */
export function scoreCandidate(club: ClubToPlace, cand: WikidataClub): number {
  let name = bestNameSimilarity(club.name, cand)
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

/**
 * Full-text search limited to items that are football clubs (P31 = Q476028). Finds clubs whose
 * short name is also a city or a word ("Rijeka", "Apollon", "Virtus") that label search ranks low.
 */
export async function searchClubQids(fetcher: Fetch, name: string, sleep: (ms: number) => Promise<void>): Promise<string[]> {
  const url = `${SEARCH_URL}?${new URLSearchParams({
    action: 'query', list: 'search', srsearch: `${name} haswbstatement:P31=Q476028`, srnamespace: '0', srlimit: '7', format: 'json',
  })}`
  const data = (await fetchJson(fetcher, url, {}, sleep)) as { query?: { search?: { title: string }[] } }
  return (data.query?.search ?? []).map((s) => s.title).filter((t) => /^Q\d+$/.test(t))
}

/** Labels (every language) and aliases for items, 50 per call. */
export async function fetchNames(fetcher: Fetch, qids: string[], sleep: (ms: number) => Promise<void>): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  for (let i = 0; i < qids.length; i += 50) {
    const url = `${SEARCH_URL}?${new URLSearchParams({ action: 'wbgetentities', ids: qids.slice(i, i + 50).join('|'), props: 'labels|aliases', format: 'json' })}`
    const data = (await fetchJson(fetcher, url, {}, sleep)) as {
      entities?: Record<string, { labels?: Record<string, { value: string }>; aliases?: Record<string, { value: string }[]> }>
    }
    for (const [qid, e] of Object.entries(data.entities ?? {})) {
      const names = [...Object.values(e.labels ?? {}).map((l) => l.value), ...Object.values(e.aliases ?? {}).flat().map((a) => a.value)]
      out.set(qid, [...new Set(names)])
    }
    await sleep(SEARCH_PAUSE_MS)
  }
  return out
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

/**
 * Review rows written before the sync stored labels have only a QID. Fetch the
 * names for those (one call per 50 items) and add them as unapplied 'label'
 * facts next to the rest of that reading. Returns how many labels were added.
 */
export async function backfillReviewLabels(db: ClubSyncDb, fetcher: Fetch, sleep: (ms: number) => Promise<void>): Promise<number> {
  const live = { entityType: 'CLUB', source: 'wikidata', applied: false, supersededAt: null }
  const qidFacts = await db.sourcedFact.findMany({ where: { ...live, field: 'wikidataId' } })
  const labelled = new Set(
    (await db.sourcedFact.findMany({ where: { ...live, field: 'label' }, select: { entityId: true } })).map((f) => f.entityId),
  )
  const missing = qidFacts.filter((f) => !labelled.has(f.entityId) && /^Q\d+$/.test(f.value))
  let added = 0
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50)
    const url = `${SEARCH_URL}?${new URLSearchParams({
      action: 'wbgetentities', ids: [...new Set(batch.map((f) => f.value))].join('|'), props: 'labels', languages: 'en', format: 'json',
    })}`
    const data = (await fetchJson(fetcher, url, {}, sleep)) as { entities?: Record<string, { labels?: { en?: { value: string } } }> }
    const rows = batch.flatMap((f) => {
      const label = data.entities?.[f.value]?.labels?.en?.value
      return label
        ? [{ entityType: 'CLUB', entityId: f.entityId, field: 'label', value: label, source: 'wikidata', sourceUrl: f.sourceUrl, licence: 'CC0', confidence: f.confidence, applied: false }]
        : []
    })
    if (rows.length) await db.sourcedFact.createMany({ data: rows })
    added += rows.length
  }
  return added
}

export interface ClubSyncSummary {
  checked: number
  placed: number
  weak: number
  none: number
  conflicts: number
  errors: number
  labelsBackfilled: number
}

type ClubSyncDb = Pick<PrismaClient, 'club' | 'sourcedFact' | '$transaction'>

export async function clubsToPlace(db: ClubSyncDb, limit: number, recheck = false): Promise<ClubToPlace[]> {
  const cutoff = new Date(Date.now() - RECHECK_DAYS * 86_400_000)
  return db.club.findMany({
    where: {
      isPlaceholder: false,
      lat: null,
      // recheck: every unplaced club, e.g. after the matcher improves.
      ...(recheck ? {} : { OR: [{ geoCheckedAt: null }, { geoCheckedAt: { lt: cutoff } }] }),
    },
    select: { id: true, name: true, country: true },
    orderBy: { id: 'asc' },
    take: limit,
  })
}

export async function runWikidataClubSync(
  db: ClubSyncDb,
  opts: { limit?: number; recheck?: boolean; fetcher?: Fetch; sleep?: (ms: number) => Promise<void>; log?: (msg: string) => void } = {},
): Promise<ClubSyncSummary> {
  const fetcher = opts.fetcher ?? fetch
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const log = opts.log ?? (() => {})
  const summary: ClubSyncSummary = { checked: 0, placed: 0, weak: 0, none: 0, conflicts: 0, errors: 0, labelsBackfilled: 0 }
  try {
    summary.labelsBackfilled = await backfillReviewLabels(db, fetcher, sleep)
  } catch (err) {
    summary.errors++
    log(`label backfill failed: ${(err as Error).message}`)
  }

  const clubs = await clubsToPlace(db, opts.limit ?? 500, opts.recheck)
  const ranked = new Map<number, { qid: string; rank: number }[]>()
  for (const club of clubs) {
    const hits: { qid: string; rank: number }[] = []
    try {
      // Two calls per club, a second apart: Wikimedia rate-limits unidentified clients hard (HTTP 429).
      // Label search finds the club by name or alias; the club-only full-text search covers
      // "F.C."/"FK" forms and short names that are also places ("Rijeka", "Apollon").
      ;(await searchQids(fetcher, club.name.trim(), sleep)).forEach((qid, rank) => hits.push({ qid, rank }))
      await sleep(SEARCH_PAUSE_MS)
      ;(await searchClubQids(fetcher, club.name, sleep)).forEach((qid, rank) => hits.push({ qid, rank: rank + 1 }))
      await sleep(SEARCH_PAUSE_MS)
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
  let names = new Map<string, string[]>()
  try {
    names = await fetchNames(fetcher, [...details.keys()], sleep)
  } catch (err) {
    summary.errors++
    log(`name fetch failed: ${(err as Error).message}`)
  }
  // Don't stamp clubs as checked when their candidates may be in a failed batch.
  const stampChecked = detailFailures === 0
  const taken = new Set(
    (await db.club.findMany({ where: { wikidataId: { not: null } }, select: { wikidataId: true } })).map((c) => c.wikidataId!),
  )

  for (const club of clubs) {
    summary.checked++
    const candidates = (ranked.get(club.id) ?? []).flatMap((h) => {
      const d = details.get(h.qid)
      return d ? [{ ...d, names: names.get(h.qid), rank: h.rank }] : []
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
      // The item's own name, so a reviewer sees "FC Sheriff Tiraspol", not just a QID.
      ['label', c.label],
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
