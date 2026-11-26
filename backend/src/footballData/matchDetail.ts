/**
 * Post-match detail for the match page (docs/football-data-plan.md): lineups, key events, team
 * stats, player lines and shots. Five requests per match, fetched once after the match settles,
 * and trimmed to what the page shows (about a quarter of the raw size) — the provider's terms
 * allow storing only what the app needs.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { ProviderError, type TheStatsApiClient } from './client.js'

type J = Record<string, any> // provider JSON, narrowed by the trim functions below

const KEY_EVENTS = new Set(['goal', 'own_goal', 'penalty_goal', 'penalty_missed', 'penalty_saved', 'yellow_card', 'second_yellow_card', 'red_card', 'substitution', 'var', 'var_decision', 'period_start', 'period_end', 'injury_time'])

const ref = (x: J | null | undefined) => (x ? { id: x.id as string, name: x.name as string } : null)

export function trimLineups(d: J): J {
  const side = (s: J | undefined) =>
    s && {
      teamId: s.id, formation: s.formation ?? null,
      startingXi: (s.starting_xi ?? []).map((p: J) => ({ id: p.id, name: p.name, position: p.position, shirt: p.jersey_number ?? null })),
      bench: (s.bench ?? s.substitutes ?? []).map((p: J) => ({ id: p.id, name: p.name, position: p.position, shirt: p.jersey_number ?? null })),
    }
  return { confirmed: Boolean(d.confirmed), home: side(d.home), away: side(d.away) }
}

export function trimEvents(d: J): J[] {
  return (d.events ?? [])
    .filter((e: J) => KEY_EVENTS.has(String(e.type)) || /goal|card|sub|var|penalt/i.test(String(e.type)))
    .map((e: J) => ({
      minute: e.minute, extra: e.extra_time || 0, period: e.period, type: e.type,
      team: ref(e.team), player: ref(e.player),
      related: ref(e.assist ?? e.player_in ?? e.related_player ?? null),
    }))
}

export function trimTeamStats(d: J): J {
  const out: J = {}
  for (const [k, v] of Object.entries(d.overview ?? {})) out[k] = (v as J)?.all ?? v
  return out
}

export function trimPlayerStats(rows: J[]): J[] {
  return rows.map((r) => ({
    playerId: r.player_id, name: r.player_name, teamId: r.team_id, position: r.position, rating: r.rating ?? null,
    started: Boolean(r.started), minutes: r.minutes_played ?? 0,
    goals: r.shooting?.goals ?? 0, assists: r.passing?.assists ?? 0,
    xg: r.shooting?.expected_goals ?? null, xa: r.shooting?.expected_assists ?? null,
    shots: r.shooting?.total_shots ?? 0, onTarget: r.shooting?.shots_on_target ?? 0,
    passes: r.passing?.total_passes ?? 0, accuratePasses: r.passing?.accurate_passes ?? 0, keyPasses: r.passing?.key_passes ?? 0,
    tackles: r.defending?.tackles ?? null, interceptions: r.defending?.interceptions ?? null,
    duelsWon: r.duels?.total_duels_won ?? r.duels?.duels_won ?? null, saves: r.goalkeeping?.saves ?? null,
  }))
}

export function trimShots(rows: J[]): J[] {
  return rows.map((s) => ({
    playerId: s.player_id, player: s.player_name, teamId: s.team_id, minute: s.minute, x: s.x, y: s.y,
    xg: s.expected_goals ?? null, result: s.result, situation: s.situation ?? null, bodyPart: s.body_part ?? null, isGoal: Boolean(s.is_goal),
  }))
}

/** Fetch, trim and store one finished match's detail. Returns false when the provider has none yet. */
export async function fetchMatchDetail(db: PrismaClient, api: TheStatsApiClient, fixture: { id: number; tsaId: string }, competitionId: number | null): Promise<boolean> {
  const base = `/football/matches/${fixture.tsaId}`
  const get = async (suffix: string, kind: string) => {
    try {
      return await api.get<J>(`${base}${suffix}`, kind, competitionId)
    } catch (e) {
      if (e instanceof ProviderError && (e.status === 404 || e.status === 409)) return null
      throw e
    }
  }
  const lineups = await get('/lineups', 'match-lineups')
  if (!lineups?.data) return false
  const [timeline, stats, players, shots] = [
    await get('/timeline', 'match-timeline'),
    await get('/stats', 'match-stats'),
    await get('/player-stats', 'match-player-stats'),
    await get('/shotmap', 'match-shotmap'),
  ]
  const data = {
    lineups: trimLineups(lineups.data) as Prisma.InputJsonValue,
    events: trimEvents(timeline?.data ?? {}) as Prisma.InputJsonValue,
    teamStats: trimTeamStats(stats?.data ?? {}) as Prisma.InputJsonValue,
    playerStats: trimPlayerStats(Array.isArray(players?.data) ? players!.data : []) as Prisma.InputJsonValue,
    shots: trimShots(Array.isArray(shots?.data) ? shots!.data : []) as Prisma.InputJsonValue,
    fetchedAt: new Date(),
  }
  await db.$transaction([
    db.matchDetail.upsert({ where: { fixtureId: fixture.id }, create: { fixtureId: fixture.id, ...data }, update: data }),
    db.fixture.update({ where: { id: fixture.id }, data: { detailFetchedAt: new Date() } }),
  ])
  return true
}
