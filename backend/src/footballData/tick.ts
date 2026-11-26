/**
 * Hourly football-data tick (docs/football-data-plan.md, "Caching"). Decides what is worth a
 * request right now, in priority order, and stops quietly when the pacer says so:
 *   1. fixtures: daily per tracked competition, or sooner when a match has settled since;
 *   2. after a match settles: that competition's table (and form/xG);
 *   3. gameweek close: player stats for the clubs that played, then a frozen snapshot;
 *   4. squads: weekly.
 */
import type { PrismaClient } from '@prisma/client'
import { DailyBudgetSpent, QuotaReserveReached, type TheStatsApiClient } from './client.js'
import { runFootballDataSync } from './sync.js'
import { SETTLE_MS, closedMatchdays, pruneSnapshots, writeSnapshot } from './snapshot.js'

const HOUR = 3_600_000
const DAY = 24 * HOUR

export interface TickSummary { fixtures: string[]; tables: string[]; snapshots: string[]; squads: boolean; pruned: number; stoppedBy: string | null; requests: number }

async function lastRequest(db: PrismaClient, kind: string, competitionId?: number): Promise<number> {
  const r = await db.providerRequest.findFirst({
    where: { provider: 'thestatsapi', kind, status: 200, ...(competitionId ? { competitionId } : {}) },
    orderBy: { at: 'desc' },
    select: { at: true },
  })
  return r?.at.getTime() ?? 0
}

export async function runFootballTick(db: PrismaClient, api: TheStatsApiClient, now = Date.now(), log: (m: string) => void = () => {}): Promise<TickSummary> {
  const out: TickSummary = { fixtures: [], tables: [], snapshots: [], squads: false, pruned: 0, stoppedBy: null, requests: 0 }
  const comps = await db.competition.findMany({ where: { tracked: true }, orderBy: { priority: 'asc' }, include: { seasons: { where: { isCurrent: true } } } })
  try {
    for (const comp of comps) {
      const season = comp.seasons[0]
      if (!season) continue
      const lastFixtures = await lastRequest(db, 'fixtures', comp.id)
      // A match that kicked off since the last fixture refresh and has now settled.
      const settled = await db.fixture.count({
        where: { seasonId: season.id, kickoffAt: { gt: new Date(lastFixtures - SETTLE_MS), lte: new Date(now - SETTLE_MS) }, status: { not: 'finished' } },
      })
      if (now - lastFixtures > DAY || settled > 0) {
        await runFootballDataSync(db, api, { only: settled > 0 ? ['fixtures', 'standings'] : ['fixtures'], competitionTsaIds: [comp.tsaId], log })
        out.fixtures.push(comp.name)
        if (settled > 0) out.tables.push(comp.name)
      }

      const fixtures = await db.fixture.findMany({ where: { seasonId: season.id }, select: { matchday: true, status: true, kickoffAt: true, homeClubId: true, awayClubId: true } })
      const done = new Set((await db.gameweekSnapshot.findMany({ where: { seasonId: season.id }, select: { matchday: true } })).map((s) => s.matchday))
      // Snapshot only the latest closed gameweek. Earlier ones are never backfilled: today's data
      // labelled with an old matchday would be wrong.
      const latest = closedMatchdays(fixtures, now).pop()
      if (latest != null && !done.has(latest)) {
        const clubIds = new Set(fixtures.filter((f) => f.matchday === latest).flatMap((f) => [f.homeClubId, f.awayClubId]).filter((c): c is number => c != null))
        await runFootballDataSync(db, api, { only: ['player-stats'], competitionTsaIds: [comp.tsaId], clubIds, statsFreshMs: 12 * HOUR, log })
        await writeSnapshot(db, season.id, latest)
        out.snapshots.push(`${comp.name} MD${latest}`)
      }
    }

    if (now - (await lastRequest(db, 'squad')) > 7 * DAY) {
      await runFootballDataSync(db, api, { only: ['squads', 'player-stats'], log })
      out.squads = true
    }
  } catch (e) {
    if (e instanceof QuotaReserveReached || e instanceof DailyBudgetSpent) out.stoppedBy = e.message
    else throw e
  }
  out.pruned = await pruneSnapshots(db)
  out.requests = api.stats.requests
  return out
}
