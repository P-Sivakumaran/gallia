/**
 * Football-data sync, phase 1 (docs/football-data-plan.md): competitions, current seasons,
 * fixtures, standings (with form and xG), squads and player season stats from TheStatsAPI.
 *
 * Safety rules:
 * - Clubs go through resolveClub (the `tsa-team-<id>` mapping the player-club sync already uses).
 * - `currentClubId` is set only on players this sync creates. For existing players it is left to
 *   the player-club sync, because changing it resolves rumours for the public scorecard.
 * - Existing players are never merged automatically. A squad player that matches more than one
 *   Gallia player is written as an unapplied SourcedFact for admin review and skipped.
 * - marketValue is never written (the provider doesn't state a currency); contractEnd only when empty.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { foldName, resolveClub, type StatsSyncDb } from '../ingestion/statsApiClubSync.js'
import { DailyBudgetSpent, ProviderError, QuotaReserveReached, type TheStatsApiClient } from './client.js'

/** Phase 1 scope: top 5 leagues and the Champions League, found by name and country. */
export const TRACKED_COMPETITIONS: { search: string; country?: string; name: string; priority: number }[] = [
  { search: 'Premier League', country: 'England', name: 'Premier League', priority: 1 },
  { search: 'LaLiga', country: 'Spain', name: 'LaLiga', priority: 2 },
  { search: 'Serie A', country: 'Italy', name: 'Serie A', priority: 3 },
  { search: 'Bundesliga', country: 'Germany', name: 'Bundesliga', priority: 4 },
  { search: 'Ligue 1', country: 'France', name: 'Ligue 1', priority: 5 },
  { search: 'Champions League', name: 'UEFA Champions League', priority: 6 },
]

const AGE_TOLERANCE = 3
const STATS_FRESH_MS = 6 * 86_400_000

type Db = PrismaClient

interface TsaCompetition { id: string; name: string; country: string | null; country_code: string | null; type: string; has_player_stats?: boolean; xg_available?: boolean }
interface TsaSeason { id: string; name: string; start_year: number | null; end_year: number | null; is_current: boolean }
interface TsaTeamRef { id: string; name: string }
interface TsaStanding { team: TsaTeamRef; position: number; matches_played: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number; goal_difference: number; points: number; group_label: string | null }
interface TsaTeamStats { form?: string | null; expected_goals_for?: number | null; expected_goals_against?: number | null }
interface TsaMatch { id: string; matchday: number | null; status: string; utc_date: string; home_team: TsaTeamRef; away_team: TsaTeamRef; score?: { home: number | null; away: number | null } | null }
export interface TsaSquadPlayer {
  id: string; name: string; position: string | null; date_of_birth: string | null; age: number | null
  nationality: string | null; height_cm: number | null; preferred_foot: string | null
  current_team: { id: string; name: string; jersey_number?: number | null } | null; contract_until?: string | null
}
interface TsaPlayerStats {
  position?: string | null; rating?: number | null; appearances?: number; starts?: number; minutes_played?: number
  scoring?: { goals?: number; assists?: number; expected_goals?: number | null; expected_assists?: number | null }
  [group: string]: unknown
}

export const POSITION_GROUPS: Record<string, string> = { G: 'GK', D: 'DEF', M: 'MID', F: 'FWD' }
export const positionGroup = (p: string | null | undefined): string | null => (p ? POSITION_GROUPS[p.toUpperCase()] ?? null : null)

export interface GalliaPlayerLite { id: number; name: string; age: number | null; currentClubId: number | null; tsaPlayerId: string | null; nationality?: string | null }

export type SquadMatch =
  | { kind: 'linked'; playerId: number }
  | { kind: 'matched'; playerId: number }
  | { kind: 'ambiguous'; candidateIds: number[] }
  | { kind: 'new' }

/** Which Gallia player a squad entry is. Never guesses between two candidates. */
export function matchSquadPlayer(sp: TsaSquadPlayer, clubId: number, byTsaId: Map<string, GalliaPlayerLite>, byName: Map<string, GalliaPlayerLite[]>): SquadMatch {
  const linked = byTsaId.get(sp.id)
  if (linked) return { kind: 'linked', playerId: linked.id }
  const candidates = (byName.get(foldName(sp.name)) ?? []).filter((p) => !p.tsaPlayerId)
  if (!candidates.length) return { kind: 'new' }
  const atClub = candidates.filter((p) => p.currentClubId === clubId)
  if (atClub.length === 1) return { kind: 'matched', playerId: atClub[0].id }
  if (atClub.length > 1) return { kind: 'ambiguous', candidateIds: atClub.map((p) => p.id) }
  if (candidates.length === 1) {
    const p = candidates[0]
    const ageOk = p.age == null || sp.age == null || Math.abs(p.age - sp.age) <= AGE_TOLERANCE
    if (!ageOk) return { kind: 'new' }
    // A namesake at another club needs more than a name: one-word names ("Wesley") are common,
    // and a stated nationality must not conflict. Otherwise an admin decides.
    const mononym = foldName(sp.name).split(' ').length < 2
    const nationalityClash = Boolean(p.nationality && sp.nationality && foldName(p.nationality) !== foldName(sp.nationality))
    return mononym || nationalityClash ? { kind: 'ambiguous', candidateIds: [p.id] } : { kind: 'matched', playerId: p.id }
  }
  return { kind: 'ambiguous', candidateIds: candidates.map((p) => p.id) }
}

export interface FootballSyncSummary {
  competitions: number
  seasons: number
  fixtures: number
  standings: number
  squadPlayers: number
  playersCreated: number
  playersLinked: number
  playersAmbiguous: number
  playerStats: number
  requests: number
  stoppedBy: string | null
}

export interface FootballSyncOptions {
  only?: ('fixtures' | 'standings' | 'squads' | 'player-stats')[]
  /** Max squads (teams) to process this run, for incremental runs */
  teamLimit?: number
  /** Only these competitions (TheStatsAPI ids); default all tracked */
  competitionTsaIds?: string[]
  /** Only these clubs' squads and player stats (e.g. the clubs that just played) */
  clubIds?: Set<number>
  /** Player stats younger than this are skipped (default 6 days; 0 = always refresh) */
  statsFreshMs?: number
  log?: (m: string) => void
}

export async function runFootballDataSync(db: Db, api: TheStatsApiClient, opts: FootballSyncOptions = {}): Promise<FootballSyncSummary> {
  const log = opts.log ?? (() => {})
  const want = (s: NonNullable<FootballSyncOptions['only']>[number]) => !opts.only?.length || opts.only.includes(s)
  const summary: FootballSyncSummary = {
    competitions: 0, seasons: 0, fixtures: 0, standings: 0, squadPlayers: 0, playersCreated: 0,
    playersLinked: 0, playersAmbiguous: 0, playerStats: 0, requests: 0, stoppedBy: null,
  }
  const clubDb = db as unknown as StatsSyncDb
  // A Champions League club is also in its domestic league: fetch each squad once per run.
  const squads = new Map<string, TsaSquadPlayer[]>()

  try {
    for (const tc of TRACKED_COMPETITIONS) {
      const known = await db.competition.findFirst({ where: { name: tc.name, tracked: true }, select: { tsaId: true } })
      if (opts.competitionTsaIds && (!known || !opts.competitionTsaIds.includes(known.tsaId))) continue
      const comp = await syncCompetition(db, api, tc)
      if (!comp) { log(`competition not found: ${tc.name}`); continue }
      summary.competitions++
      const season = await syncCurrentSeason(db, api, comp)
      if (!season) { log(`no current season: ${tc.name}`); continue }
      summary.seasons++
      const path = `competition_id=${comp.tsaId}&season_id=${season.tsaId}`

      if (want('fixtures')) {
        const matches = await api.getAll<TsaMatch>(`/football/matches?${path}`, 'fixtures', comp.id)
        for (const m of matches) {
          const homeClubId = await resolveClub(clubDb, m.home_team)
          const awayClubId = await resolveClub(clubDb, m.away_team)
          const data = {
            seasonId: season.id, matchday: m.matchday, kickoffAt: new Date(m.utc_date), status: m.status,
            homeClubId, awayClubId, homeGoals: m.score?.home ?? null, awayGoals: m.score?.away ?? null,
          }
          await db.fixture.upsert({ where: { tsaId: m.id }, create: { tsaId: m.id, ...data }, update: data })
          summary.fixtures++
        }
      }

      const teams = new Map<string, TsaTeamRef & { clubId: number }>()
      if (want('standings') || want('squads') || want('player-stats')) {
        const table = await api.get<{ data: TsaStanding[] }>(`/football/competitions/${comp.tsaId}/seasons/${season.tsaId}/standings`, 'standings', comp.id)
        for (const row of table.data) {
          const clubId = await resolveClub(clubDb, row.team)
          teams.set(row.team.id, { ...row.team, clubId })
          if (!want('standings')) continue
          const stats = await api.get<{ data: TsaTeamStats }>(`/football/teams/${row.team.id}/stats?season_id=${season.tsaId}`, 'team-stats', comp.id).catch((e) => {
            if (e instanceof ProviderError && e.status === 404) return { data: {} as TsaTeamStats }
            throw e
          })
          const data = {
            position: row.position, played: row.matches_played, wins: row.wins, draws: row.draws, losses: row.losses,
            goalsFor: row.goals_for, goalsAgainst: row.goals_against, goalDifference: row.goal_difference, points: row.points,
            form: stats.data.form ?? null, xgFor: stats.data.expected_goals_for ?? null, xgAgainst: stats.data.expected_goals_against ?? null,
          }
          const groupLabel = row.group_label ?? ''
          await db.standing.upsert({
            where: { seasonId_clubId_groupLabel: { seasonId: season.id, clubId, groupLabel } },
            create: { seasonId: season.id, clubId, groupLabel, ...data },
            update: data,
          })
          summary.standings++
        }
      }

      if (want('squads') || want('player-stats')) {
        const all = await db.player.findMany({ select: { id: true, name: true, age: true, currentClubId: true, tsaPlayerId: true, nationality: true } })
        const byTsaId = new Map(all.filter((p) => p.tsaPlayerId).map((p) => [p.tsaPlayerId!, p]))
        const byName = new Map<string, GalliaPlayerLite[]>()
        for (const p of all) {
          const k = foldName(p.name)
          byName.set(k, [...(byName.get(k) ?? []), p])
        }
        let processed = 0
        for (const team of teams.values()) {
          if (opts.clubIds && !opts.clubIds.has(team.clubId)) continue
          if (opts.teamLimit != null && processed >= opts.teamLimit) break
          processed++
          let squad = squads.get(team.id)
          if (!squad) {
            squad = (await api.get<{ data: TsaSquadPlayer[] }>(`/football/teams/${team.id}/players`, 'squad', comp.id)).data
            squads.set(team.id, squad)
          }
          for (const sp of squad) {
            summary.squadPlayers++
            const playerId = await upsertSquadPlayer(db, sp, team.clubId, byTsaId, byName, summary)
            if (playerId == null || !want('player-stats') || !comp.hasPlayerStats) continue
            const existing = await db.playerSeasonStat.findUnique({ where: { playerId_seasonId: { playerId, seasonId: season.id } }, select: { syncedAt: true } })
            if (existing && Date.now() - existing.syncedAt.getTime() < (opts.statsFreshMs ?? STATS_FRESH_MS)) continue
            const res = await api
              .get<{ data: TsaPlayerStats | null }>(`/football/players/${sp.id}/stats?${path}`, 'player-stats', comp.id)
              .catch((e) => {
                if (e instanceof ProviderError && e.status === 404) return { data: null }
                throw e
              })
            if (!res.data || !res.data.appearances) continue
            await upsertPlayerSeasonStat(db, playerId, season.id, team.clubId, res.data)
            summary.playerStats++
          }
        }
      }
      log(`${tc.name}: ${JSON.stringify({ fixtures: summary.fixtures, standings: summary.standings, players: summary.squadPlayers, stats: summary.playerStats })}`)
    }
  } catch (e) {
    if (e instanceof QuotaReserveReached || e instanceof DailyBudgetSpent) {
      summary.stoppedBy = e.message
      log(`stopped: ${e.message}`)
    } else {
      throw e
    }
  }
  summary.requests = api.stats.requests
  return summary
}

async function syncCompetition(db: Db, api: TheStatsApiClient, tc: (typeof TRACKED_COMPETITIONS)[number]) {
  const q = new URLSearchParams({ search: tc.search, ...(tc.country ? { country: tc.country } : {}) })
  const list = await api.get<{ data: TsaCompetition[] }>(`/football/competitions?${q}`, 'competitions')
  const fold = (s: string) => foldName(s).replace(/\s/g, '')
  const hit = list.data.find((c) => fold(c.name) === fold(tc.name)) ?? list.data.find((c) => fold(c.name).includes(fold(tc.search)))
  if (!hit) return null
  const data = {
    name: hit.name, country: hit.country, countryCode: hit.country_code, type: hit.type,
    hasPlayerStats: Boolean(hit.has_player_stats), xgAvailable: Boolean(hit.xg_available), tracked: true, priority: tc.priority,
  }
  return db.competition.upsert({ where: { tsaId: hit.id }, create: { tsaId: hit.id, ...data }, update: data })
}

async function syncCurrentSeason(db: Db, api: TheStatsApiClient, comp: { id: number; tsaId: string }) {
  const list = await api.get<{ data: TsaSeason[] }>(`/football/competitions/${comp.tsaId}/seasons`, 'seasons', comp.id)
  const current = list.data.find((s) => s.is_current) ?? list.data[0]
  if (!current) return null
  await db.season.updateMany({ where: { competitionId: comp.id, isCurrent: true, NOT: { tsaId: current.id } }, data: { isCurrent: false } })
  const data = { competitionId: comp.id, name: current.name, startYear: current.start_year, endYear: current.end_year, isCurrent: true }
  return db.season.upsert({ where: { tsaId: current.id }, create: { tsaId: current.id, ...data }, update: data })
}

async function upsertSquadPlayer(
  db: Db, sp: TsaSquadPlayer, clubId: number,
  byTsaId: Map<string, GalliaPlayerLite>, byName: Map<string, GalliaPlayerLite[]>, summary: FootballSyncSummary,
): Promise<number | null> {
  const profile = {
    positionGroup: positionGroup(sp.position),
    dateOfBirth: sp.date_of_birth ? new Date(sp.date_of_birth) : null,
    heightCm: sp.height_cm ?? null,
    preferredFoot: sp.preferred_foot ?? null,
    shirtNumber: sp.current_team?.jersey_number ?? null,
  }
  const match = matchSquadPlayer(sp, clubId, byTsaId, byName)
  if (match.kind === 'ambiguous') {
    summary.playersAmbiguous++
    const pending = await db.sourcedFact.findFirst({
      where: { entityType: 'PLAYER', field: 'tsaPlayerId', value: sp.id, applied: false, supersededAt: null },
      select: { id: true },
    })
    if (pending) return null
    await db.sourcedFact.create({
      data: {
        entityType: 'PLAYER', entityId: match.candidateIds[0], field: 'tsaPlayerId', value: sp.id, source: 'thestatsapi',
        sourceUrl: null, licence: 'api-paid', confidence: 0.5, applied: false,
      },
    })
    return null
  }
  if (match.kind === 'new') {
    const created = await db.player.create({
      data: {
        name: sp.name, tsaPlayerId: sp.id, age: sp.age, nationality: sp.nationality, currentClubId: clubId, autoCreated: true,
        contractEnd: sp.contract_until ? new Date(sp.contract_until) : null, ...profile,
      },
      select: { id: true, name: true, age: true, currentClubId: true, tsaPlayerId: true, nationality: true },
    })
    byTsaId.set(sp.id, created)
    summary.playersCreated++
    return created.id
  }
  // linked or matched: fill profile fields; never currentClubId, marketValue, or a non-empty contractEnd
  const current = await db.player.findUnique({ where: { id: match.playerId }, select: { contractEnd: true, nationality: true, age: true } })
  await db.player.update({
    where: { id: match.playerId },
    data: {
      tsaPlayerId: sp.id, ...profile,
      ...(current?.nationality ? {} : { nationality: sp.nationality }),
      ...(sp.age != null ? { age: sp.age } : {}),
      ...(current?.contractEnd || !sp.contract_until ? {} : { contractEnd: new Date(sp.contract_until) }),
    },
  })
  if (match.kind === 'matched') summary.playersLinked++
  const lite = byName.get(foldName(sp.name))?.find((p) => p.id === match.playerId)
  if (lite) { lite.tsaPlayerId = sp.id; byTsaId.set(sp.id, lite) }
  return match.playerId
}

async function upsertPlayerSeasonStat(db: Db, playerId: number, seasonId: number, clubId: number, s: TsaPlayerStats) {
  const detail = Object.fromEntries(Object.entries(s).filter(([, v]) => v && typeof v === 'object')) as Prisma.InputJsonValue
  const data = {
    clubId, positionGroup: positionGroup(s.position), rating: s.rating ?? null,
    appearances: s.appearances ?? 0, starts: s.starts ?? 0, minutes: s.minutes_played ?? 0,
    goals: s.scoring?.goals ?? 0, assists: s.scoring?.assists ?? 0,
    xg: s.scoring?.expected_goals ?? null, xa: s.scoring?.expected_assists ?? null,
    detail, syncedAt: new Date(),
  }
  await db.playerSeasonStat.upsert({ where: { playerId_seasonId: { playerId, seasonId } }, create: { playerId, seasonId, ...data }, update: data })
}
