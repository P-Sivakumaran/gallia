/**
 * Career history from Wikidata (CC0): docs/transfer-database-plan.md, phase 1.
 *
 * 1. resolvePlayerQids: find Wikidata ids for squad players by date of birth (exact) plus name.
 *    A DOB batch returns every footballer born that day; a player is linked only when exactly one
 *    of them carries the same folded name. Anything else is left alone.
 * 2. importCareers: each club spell (P54 with start/end) becomes a move into that club. Youth,
 *    reserve and national teams are skipped; loans come from the "acquisition transaction" (P1642)
 *    qualifier, and the move back from a loan is a loan end. Fees aren't in Wikidata, so feeStatus
 *    stays unknown until a filing or cited article fills it.
 */
import type { PrismaClient } from '@prisma/client'
import { foldName } from '../ingestion/statsApiClubSync.js'
import { isSideTeam } from '../ingestion/wikidataClubSync.js'
import { recordTransfer } from './ledger.js'

const SPARQL_URL = 'https://query.wikidata.org/sparql'
const USER_AGENT = 'GalliaCareerSync/1.0 (football transfer research)'
const NATIONAL = /\bnational\b|\bunder[- ]?\d{2}\b|\bu\d{2}\b|\bolympic\b/i

type Fetch = (url: string, init?: RequestInit) => Promise<Response>
type Sleep = (ms: number) => Promise<void>

async function sparql(fetcher: Fetch, sleep: Sleep, query: string): Promise<Record<string, { value: string }>[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response
    try {
      res = await fetcher(SPARQL_URL, {
        method: 'POST',
        body: new URLSearchParams({ query, format: 'json' }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      })
    } catch (e) {
      if (attempt === 3) throw e
      await sleep(5_000 * (attempt + 1))
      continue
    }
    if (res.status === 429 || res.status === 503) {
      await sleep((Number(res.headers.get('retry-after')) || 10 * (attempt + 1)) * 1000)
      continue
    }
    if (!res.ok) throw new Error(`Wikidata SPARQL ${res.status}`)
    const body = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }
    await sleep(1_500) // be gentle: Wikidata rate-limits unidentified bursts
    return body.results.bindings
  }
  throw new Error('Wikidata kept rate-limiting')
}

const qid = (uri: string) => uri.split('/').pop()!

/** Wikidata dates can be unknown values (blank-node URIs) or out of range; those become null. */
export function validDate(v: string | undefined): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1900 ? null : d
}

export interface ResolveSummary { checked: number; linked: number; ambiguous: number; none: number }

/** Link squad players to Wikidata by exact date of birth plus folded name. */
export async function resolvePlayerQids(db: PrismaClient, opts: { fetcher?: Fetch; sleep?: Sleep; limit?: number; log?: (m: string) => void } = {}): Promise<ResolveSummary> {
  const fetcher = opts.fetcher ?? fetch
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const players = await db.player.findMany({
    where: { wikidataId: null, tsaPlayerId: { not: null }, dateOfBirth: { not: null } },
    select: { id: true, name: true, dateOfBirth: true },
    take: opts.limit ?? 5000,
  })
  const summary: ResolveSummary = { checked: 0, linked: 0, ambiguous: 0, none: 0 }
  const byDob = new Map<string, typeof players>()
  for (const p of players) {
    const d = p.dateOfBirth!.toISOString().slice(0, 10)
    byDob.set(d, [...(byDob.get(d) ?? []), p])
  }
  const dobs = [...byDob.keys()]
  for (let i = 0; i < dobs.length; i += 25) {
    const batch = dobs.slice(i, i + 25)
    const values = batch.map((d) => `"${d}T00:00:00Z"^^xsd:dateTime`).join(' ')
    const rows = await sparql(fetcher, sleep, `SELECT ?p ?dob ?name WHERE {
  VALUES ?dob { ${values} }
  ?p wdt:P569 ?dob ; wdt:P106 wd:Q937857 .
  { ?p rdfs:label ?name } UNION { ?p skos:altLabel ?name }
  FILTER(LANG(?name) IN ("en","es","it","de","fr","pt","nl","mul"))
}`)
    const footballers = new Map<string, { qid: string; names: Set<string> }[]>()
    for (const r of rows) {
      const d = r.dob.value.slice(0, 10)
      const list = footballers.get(d) ?? []
      let entry = list.find((x) => x.qid === qid(r.p.value))
      if (!entry) { entry = { qid: qid(r.p.value), names: new Set() }; list.push(entry) }
      entry.names.add(foldName(r.name.value))
      footballers.set(d, list)
    }
    for (const d of batch) {
      for (const p of byDob.get(d)!) {
        summary.checked++
        const hits = (footballers.get(d) ?? []).filter((f) => f.names.has(foldName(p.name)))
        if (hits.length === 1) {
          await db.player.update({ where: { id: p.id }, data: { wikidataId: hits[0].qid } })
          summary.linked++
        } else if (hits.length > 1) summary.ambiguous++
        else summary.none++
      }
    }
    opts.log?.(`resolve: ${summary.checked}/${players.length} checked, ${summary.linked} linked`)
  }
  return summary
}

export interface Spell { teamQid: string; teamName: string; start: Date | null; end: Date | null; loan: boolean }

const DAY = 86_400_000

/**
 * Moves implied by a career. "From" is where the player actually was just before the move:
 * a spell still running then (a loan if one was running, it's more specific), else the latest one.
 * A loan's "from" is its parent club (the latest permanent spell before it). A loan that becomes a
 * permanent stay at the same club is recorded as a move from the parent club.
 */
export function movesFromSpells(spells: Spell[]): { from: Spell | null; to: Spell; type: 'loan' | 'loan_end' | 'unknown' }[] {
  const clubs = spells
    .filter((s) => s.start && !NATIONAL.test(s.teamName) && !isSideTeam(s.teamName))
    .sort((a, b) => a.start!.getTime() - b.start!.getTime())
  const parentOf = (i: number): Spell | null => {
    for (let j = i - 1; j >= 0; j--) if (!clubs[j].loan) return clubs[j]
    return null
  }
  const moves: { from: Spell | null; to: Spell; type: 'loan' | 'loan_end' | 'unknown' }[] = []
  for (let i = 1; i < clubs.length; i++) {
    const to = clubs[i]
    const t = to.start!.getTime() - DAY
    let from: Spell | null
    if (to.loan) {
      from = parentOf(i)
    } else {
      const before = clubs.slice(0, i)
      const active = before.filter((s) => s.start!.getTime() <= t && (!s.end || s.end.getTime() >= t))
      from = active.find((s) => s.loan) ?? active[active.length - 1] ?? [...before].sort((a, b) => (b.end?.getTime() ?? 0) - (a.end?.getTime() ?? 0))[0] ?? null
    }
    if (!from) continue
    let type: 'loan' | 'loan_end' | 'unknown' = to.loan ? 'loan' : 'unknown'
    if (!to.loan && from.loan) {
      const parent = parentOf(clubs.indexOf(from))
      if (from.teamQid === to.teamQid) {
        // Loan made permanent: the move is from the parent club.
        if (!parent || parent.teamQid === to.teamQid) continue
        from = parent
      } else if (parent && parent.teamQid === to.teamQid) {
        type = 'loan_end'
      }
    }
    if (from.teamQid === to.teamQid) continue
    moves.push({ from, to, type })
  }
  return moves
}

export interface CareerSummary { players: number; moves: number; created: number }

export async function importCareers(db: PrismaClient, opts: { fetcher?: Fetch; sleep?: Sleep; limit?: number; log?: (m: string) => void } = {}): Promise<CareerSummary> {
  const fetcher = opts.fetcher ?? fetch
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const players = await db.player.findMany({ where: { wikidataId: { not: null }, tsaPlayerId: { not: null } }, select: { id: true, wikidataId: true }, take: opts.limit ?? 5000 })
  const clubs = new Map((await db.club.findMany({ where: { wikidataId: { not: null } }, select: { id: true, wikidataId: true } })).map((c) => [c.wikidataId!, c.id]))
  const summary: CareerSummary = { players: 0, moves: 0, created: 0 }
  for (let i = 0; i < players.length; i += 40) {
    const batch = players.slice(i, i + 40)
    const rows = await sparql(fetcher, sleep, `SELECT ?p ?team ?teamLabel ?start ?end ?acqLabel WHERE {
  VALUES ?p { ${batch.map((p) => `wd:${p.wikidataId}`).join(' ')} }
  ?p p:P54 ?st . ?st ps:P54 ?team .
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end } OPTIONAL { ?st pq:P1642 ?acq }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`)
    const spells = new Map<string, Spell[]>()
    for (const r of rows) {
      const p = qid(r.p.value)
      const s: Spell = {
        teamQid: qid(r.team.value), teamName: r.teamLabel?.value ?? qid(r.team.value),
        start: validDate(r.start?.value), end: validDate(r.end?.value),
        loan: /loan/i.test(r.acqLabel?.value ?? ''),
      }
      spells.set(p, [...(spells.get(p) ?? []), s])
    }
    for (const p of batch) {
      summary.players++
      for (const m of movesFromSpells(spells.get(p.wikidataId!) ?? [])) {
        summary.moves++
        const d = m.to.start!
        const yearOnly = d.getUTCMonth() === 0 && d.getUTCDate() === 1
        const r = await recordTransfer(db, {
          playerId: p.id,
          fromClubId: m.from ? clubs.get(m.from.teamQid) ?? null : null, fromTeamName: m.from?.teamName ?? null, fromTeamQid: m.from?.teamQid ?? null,
          toClubId: clubs.get(m.to.teamQid) ?? null, toTeamName: m.to.teamName, toTeamQid: m.to.teamQid,
          date: d, datePrecision: yearOnly ? 'year' : 'day', type: m.type,
          source: 'wikidata', sourceUrl: `https://www.wikidata.org/wiki/${p.wikidataId}`, licence: 'CC0', confidence: 0.75,
        })
        if (r === 'created') summary.created++
      }
    }
    opts.log?.(`careers: ${summary.players}/${players.length} players, ${summary.moves} moves`)
  }
  return summary
}
