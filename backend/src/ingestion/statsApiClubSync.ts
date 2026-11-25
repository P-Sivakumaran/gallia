/**
 * Current-club sync from TheStatsAPI (api.thestatsapi.com), for players with
 * open rumours only.
 *
 * Why this exists: window-close resolution (outcomeDetector.ts) marks a
 * rumour COMPLETED when player.currentClubId === toClubId. The Sportmonks
 * catalog only covered UEFA club competitions, so most moves never updated
 * currentClubId. TheStatsAPI covers ~150 competitions and returns each
 * player's current_team, but has no transfer history, so it can confirm
 * where a player is now and never when he moved.
 *
 * A wrong match here can auto-complete the wrong rumour, so matching is
 * conservative and skips anything it cannot pin to one person:
 *   1. Candidates are search hits whose name equals ours after folding
 *      accents and case ("Vinícius Júnior" == "Vinicius Junior").
 *   2. A candidate whose team is one of the rumour's clubs (current, from,
 *      to) wins, if it is the only such candidate.
 *   3. Single-word names ("Rodri", "Bruno") must pass step 2; there are
 *      hundreds of namesakes.
 *   4. Otherwise one candidate is accepted when its age is within
 *      AGE_TOLERANCE of ours (seed ages run a couple of years stale), or
 *      when several remain and exactly one is within one year.
 *   5. "No team" leaves the row unchanged: absence is not evidence.
 *
 * Rate budget: the key is shared with Overround (12 requests/minute in
 * total), so calls are spaced REQUEST_SPACING_MS apart and a 429 stops the
 * run instead of retrying.
 */
import type { PrismaClient } from '@prisma/client'
import { invalidateEntityCache } from './entityMatcher.js'

const BASE_URL = process.env.STATS_API_BASE_URL ?? 'https://api.thestatsapi.com/api'
const REQUEST_SPACING_MS = 6_000 // 10/min ceiling for Gallia; Overround keeps headroom.
const AGE_TOLERANCE = 3
const NO_TEAM_NAME = 'no team'
const OPEN_STATUSES = ['PENDING', 'HOT'] as const

export interface StatsApiPlayer {
  id: string
  name: string
  age: number | null
  current_team: { id: string; name: string } | null
}

export type SearchPlayers = (name: string) => Promise<StatsApiPlayer[]>

export class StatsApiRateLimited extends Error {}

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function foldName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[-.,'’`()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Tokens that differ between sources for the same club ("AFC Ajax" / "Ajax",
// "FC Barcelona" / "Barcelona"). Youth sides ("Chelsea U21") map to the
// parent club: a signing for the academy is still a move to that club.
const CLUB_NOISE = new Set(['fc', 'afc', 'cf'])
export function foldClubName(name: string): string {
  return foldName(name)
    .split(' ')
    .filter((t) => !CLUB_NOISE.has(t) && !/^u\d{2}$/.test(t))
    .join(' ')
}

interface ClubRef {
  id: number
  name: string
}

export interface PlayerToSync {
  id: number
  name: string
  age: number | null
  currentClubId: number | null
  knownClubs: ClubRef[] // current, from and to clubs across the player's open rumours
}

export type MatchResult =
  | { kind: 'matched'; candidate: StatsApiPlayer }
  | { kind: 'unmatched' }
  | { kind: 'ambiguous'; count: number }

export function pickCandidate(player: PlayerToSync, hits: StatsApiPlayer[]): MatchResult {
  const target = foldName(player.name)
  const candidates = hits.filter((h) => foldName(h.name) === target)
  if (!candidates.length) return { kind: 'unmatched' }

  const known = new Set(player.knownClubs.map((c) => foldClubName(c.name)))
  const inKnownClub = candidates.filter((c) => c.current_team && known.has(foldClubName(c.current_team.name)))
  if (inKnownClub.length === 1) return { kind: 'matched', candidate: inKnownClub[0] }
  if (inKnownClub.length > 1) return { kind: 'ambiguous', count: inKnownClub.length }

  if (!target.includes(' ')) return { kind: 'ambiguous', count: candidates.length }

  const ageGap = (c: StatsApiPlayer) =>
    player.age == null || c.age == null ? 0 : Math.abs(c.age - player.age)

  if (candidates.length === 1) {
    return ageGap(candidates[0]) <= AGE_TOLERANCE
      ? { kind: 'matched', candidate: candidates[0] }
      : { kind: 'unmatched' }
  }
  if (player.age != null) {
    const close = candidates.filter((c) => c.age != null && ageGap(c) <= 1)
    if (close.length === 1) return { kind: 'matched', candidate: close[0] }
  }
  return { kind: 'ambiguous', count: candidates.length }
}

export interface StatsSyncDb {
  rumour: { findMany(args: any): Promise<any[]> }
  club: {
    findFirst(args: any): Promise<{ id: number; externalId: string | null } | null>
    findMany(args: any): Promise<{ id: number; name: string; externalId: string | null }[]>
    update(args: any): Promise<unknown>
    create(args: any): Promise<{ id: number }>
  }
  player: { update(args: any): Promise<unknown> }
}

export async function playersWithOpenRumours(db: StatsSyncDb): Promise<PlayerToSync[]> {
  const rumours = await db.rumour.findMany({
    where: { status: { in: [...OPEN_STATUSES] } },
    include: { player: { include: { currentClub: true } }, fromClub: true, toClub: true },
  })
  const byId = new Map<number, PlayerToSync>()
  for (const r of rumours) {
    if (!r.player) continue
    const entry: PlayerToSync = byId.get(r.player.id) ?? {
      id: r.player.id,
      name: r.player.name,
      age: r.player.age ?? null,
      currentClubId: r.player.currentClubId ?? null,
      knownClubs: [],
    }
    for (const c of [r.player.currentClub, r.fromClub, r.toClub]) {
      if (c && !entry.knownClubs.some((k) => k.id === c.id)) entry.knownClubs.push({ id: c.id, name: c.name })
    }
    byId.set(r.player.id, entry)
  }
  return [...byId.values()]
}

/** Find the Gallia club for a TheStatsAPI team, adopting or creating a row. */
export async function resolveClub(db: StatsSyncDb, team: { id: string; name: string }): Promise<number> {
  const externalId = `tsa-team-${team.id}`
  const byExternalId = await db.club.findFirst({ where: { externalId } })
  if (byExternalId) return byExternalId.id

  const target = foldClubName(team.name)
  const sameName = (await db.club.findMany({ where: {} })).filter((c) => foldClubName(c.name) === target)
  if (sameName.length === 1) {
    // Only claim the row when it has no id from another source (seed/Sportmonks).
    if (!sameName[0].externalId) await db.club.update({ where: { id: sameName[0].id }, data: { externalId } })
    return sameName[0].id
  }
  if (sameName.length > 1) {
    console.warn(`[statsApiClubSync] ${sameName.length} clubs match "${team.name}"; creating a separate row`)
  }
  const created = await db.club.create({ data: { externalId, name: team.name, autoCreated: true } })
  return created.id
}

export interface StatsSyncSummary {
  checked: number
  updated: number
  unchanged: number
  unmatched: number
  ambiguous: number
  noTeam: number
  errors: number
  rateLimited: boolean
}

export async function runStatsApiClubSync(
  db: StatsSyncDb,
  search: SearchPlayers,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<StatsSyncSummary> {
  const summary: StatsSyncSummary = {
    checked: 0, updated: 0, unchanged: 0, unmatched: 0, ambiguous: 0, noTeam: 0, errors: 0, rateLimited: false,
  }
  const players = await playersWithOpenRumours(db)

  for (const [i, player] of players.entries()) {
    if (i > 0) await sleep(REQUEST_SPACING_MS)
    summary.checked++
    let hits: StatsApiPlayer[]
    try {
      hits = await search(player.name)
    } catch (err) {
      if (err instanceof StatsApiRateLimited) {
        summary.rateLimited = true
        console.warn('[statsApiClubSync] Rate limited; stopping this run')
        break
      }
      summary.errors++
      console.warn(`[statsApiClubSync] Search failed for "${player.name}":`, (err as Error).message)
      continue
    }

    const match = pickCandidate(player, hits)
    if (match.kind !== 'matched') {
      summary[match.kind]++
      continue
    }
    const team = match.candidate.current_team
    if (!team || foldName(team.name) === NO_TEAM_NAME) {
      summary.noTeam++
      continue
    }
    const clubId = await resolveClub(db, team)
    if (clubId === player.currentClubId) {
      summary.unchanged++
      continue
    }
    await db.player.update({ where: { id: player.id }, data: { currentClubId: clubId } })
    summary.updated++
  }

  if (summary.updated) invalidateEntityCache()
  return summary
}

export function statsApiSearch(apiKey: string): SearchPlayers {
  return async (name) => {
    const url = `${BASE_URL}/football/players?per_page=25&search=${encodeURIComponent(name)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15_000) })
    if (res.status === 429) throw new StatsApiRateLimited('429')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as { data?: StatsApiPlayer[] }
    return body.data ?? []
  }
}

export function runStatsApiClubSyncWithPrisma(prisma: PrismaClient, apiKey: string): Promise<StatsSyncSummary> {
  return runStatsApiClubSync(prisma as unknown as StatsSyncDb, statsApiSearch(apiKey))
}
