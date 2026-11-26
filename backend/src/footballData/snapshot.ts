/**
 * Gameweek snapshots (docs/football-data-plan.md, "Caching"). When every match of a matchday is
 * over (+3 h for the provider to finalise stats), the table, leaders and Gallia cards are frozen
 * into one row that pages read until the next gameweek closes. Snapshots are kept for the current
 * season and the previous one only.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import { computeCards, type Card } from './card.js'

export const SETTLE_MS = 3 * 3_600_000
const DONE = new Set(['finished', 'postponed', 'cancelled', 'canceled', 'abandoned', 'awarded'])

export interface FixtureLite { matchday: number | null; status: string; kickoffAt: Date }

/** Matchdays whose every fixture is over and settled, in order. */
export function closedMatchdays(fixtures: FixtureLite[], now: number): number[] {
  const byDay = new Map<number, FixtureLite[]>()
  for (const f of fixtures) if (f.matchday != null) byDay.set(f.matchday, [...(byDay.get(f.matchday) ?? []), f])
  return [...byDay.entries()]
    .filter(([, fs]) => fs.every((f) => DONE.has(f.status.toLowerCase()) && f.kickoffAt.getTime() + SETTLE_MS <= now))
    .map(([d]) => d)
    .sort((a, b) => a - b)
}

export interface SnapshotPayload {
  season: { id: number; name: string; competition: string }
  matchday: number
  standings: { position: number; clubId: number; club: string; played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number; form: string | null; xgFor: number | null; xgAgainst: number | null; groupLabel: string }[]
  leaders: Record<'goals' | 'assists' | 'xg' | 'rating', { playerId: number; name: string; clubId: number | null; value: number }[]>
  cards: Card[]
  source: 'TheStatsAPI'
}

const LEADER_MIN_MINUTES = 270

export async function buildSnapshot(db: PrismaClient, seasonId: number, matchday: number): Promise<SnapshotPayload> {
  const season = await db.season.findUniqueOrThrow({ where: { id: seasonId }, include: { competition: { select: { name: true } } } })
  const table = await db.standing.findMany({ where: { seasonId }, orderBy: [{ groupLabel: 'asc' }, { position: 'asc' }] })
  const clubs = new Map((await db.club.findMany({ where: { id: { in: table.map((t) => t.clubId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]))
  const stats = await db.playerSeasonStat.findMany({
    where: { seasonId },
    select: { playerId: true, clubId: true, positionGroup: true, minutes: true, goals: true, assists: true, xg: true, xa: true, rating: true, detail: true, player: { select: { name: true } } },
  })
  const leader = (key: 'goals' | 'assists' | 'xg' | 'rating') =>
    stats
      .filter((s) => (key === 'rating' ? s.minutes >= LEADER_MIN_MINUTES && s.rating != null : (s[key] ?? 0) > 0))
      .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))
      .slice(0, 10)
      .map((s) => ({ playerId: s.playerId, name: s.player.name, clubId: s.clubId, value: Number(s[key] ?? 0) }))
  return {
    season: { id: season.id, name: season.name, competition: season.competition.name },
    matchday,
    standings: table.map((t) => ({
      position: t.position, clubId: t.clubId, club: clubs.get(t.clubId) ?? '?', played: t.played, wins: t.wins, draws: t.draws,
      losses: t.losses, goalsFor: t.goalsFor, goalsAgainst: t.goalsAgainst, goalDifference: t.goalDifference, points: t.points,
      form: t.form, xgFor: t.xgFor, xgAgainst: t.xgAgainst, groupLabel: t.groupLabel,
    })),
    leaders: { goals: leader('goals'), assists: leader('assists'), xg: leader('xg'), rating: leader('rating') },
    cards: computeCards(stats),
    source: 'TheStatsAPI',
  }
}

export async function writeSnapshot(db: PrismaClient, seasonId: number, matchday: number): Promise<void> {
  const payload = (await buildSnapshot(db, seasonId, matchday)) as unknown as Prisma.InputJsonValue
  await db.gameweekSnapshot.upsert({
    where: { seasonId_matchday: { seasonId, matchday } },
    create: { seasonId, matchday, payload },
    update: { payload, closedAt: new Date() },
  })
}

/** Deletes snapshots older than the previous season of each competition (provider terms: store only what's needed). */
export async function pruneSnapshots(db: PrismaClient): Promise<number> {
  const seasons = await db.season.findMany({ select: { id: true, competitionId: true, startYear: true, isCurrent: true } })
  const keep = new Set<number>()
  const byComp = new Map<number, typeof seasons>()
  for (const s of seasons) byComp.set(s.competitionId, [...(byComp.get(s.competitionId) ?? []), s])
  for (const list of byComp.values()) {
    list.sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0))
    list.slice(0, 2).forEach((s) => keep.add(s.id))
  }
  const res = await db.gameweekSnapshot.deleteMany({ where: { seasonId: { notIn: [...keep] } } })
  return res.count
}
