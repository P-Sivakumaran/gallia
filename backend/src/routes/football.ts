/**
 * Public football-data routes (docs/football-data-plan.md). Page-shaped and rate-limited by
 * design: TheStatsAPI's terms forbid republishing the data as a dataset or competing API, so
 * there is no bulk or export endpoint, and these routes are not part of the API-key product.
 * Every response names its source. Tables and cards come from the latest gameweek snapshot,
 * so responses are cacheable until the next gameweek closes.
 */
import { Router, type Request, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { rateLimitMiddleware } from '../lib/rateLimit.js'
import type { SnapshotPayload } from '../footballData/snapshot.js'

const router = Router()
const prisma = new PrismaClient()
const SOURCE = 'TheStatsAPI'

router.use(
  rateLimitMiddleware({
    keyFn: (req: { ip?: string }) => `football:${req.ip ?? 'unknown'}`,
    limit: 120,
    windowSeconds: 60,
    failureMode: 'OPEN',
  }),
)

const cacheUntilNextGameweek = (res: Response) => res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600')

async function latestSnapshot(seasonId: number): Promise<{ matchday: number; closedAt: Date; payload: SnapshotPayload } | null> {
  const s = await prisma.gameweekSnapshot.findFirst({ where: { seasonId }, orderBy: { matchday: 'desc' } })
  return s ? { matchday: s.matchday, closedAt: s.closedAt, payload: s.payload as unknown as SnapshotPayload } : null
}

// GET /football/competitions — tracked competitions with their current season
router.get('/competitions', async (_req: Request, res: Response) => {
  const comps = await prisma.competition.findMany({
    where: { tracked: true },
    orderBy: { priority: 'asc' },
    select: { id: true, name: true, country: true, type: true, seasons: { where: { isCurrent: true }, select: { id: true, name: true } } },
  })
  cacheUntilNextGameweek(res)
  res.json({ source: SOURCE, competitions: comps.map((c) => ({ id: c.id, name: c.name, country: c.country, type: c.type, season: c.seasons[0] ?? null })) })
})

// GET /football/competitions/:id/table — table and leaders from the latest gameweek snapshot
router.get('/competitions/:id/table', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid competition id' }); return }
  const season = await prisma.season.findFirst({ where: { competitionId: id, isCurrent: true }, include: { competition: { select: { name: true, tracked: true } } } })
  if (!season || !season.competition.tracked) { res.status(404).json({ error: 'Competition not found' }); return }
  const snap = await latestSnapshot(season.id)
  cacheUntilNextGameweek(res)
  if (snap) {
    const { standings, leaders } = snap.payload
    res.json({ source: SOURCE, competition: season.competition.name, season: season.name, matchday: snap.matchday, frozenAt: snap.closedAt, standings, leaders })
    return
  }
  // Before the first gameweek closes: the stored table, no leaders.
  const rows = await prisma.standing.findMany({ where: { seasonId: season.id }, orderBy: [{ groupLabel: 'asc' }, { position: 'asc' }] })
  const clubs = new Map((await prisma.club.findMany({ where: { id: { in: rows.map((r) => r.clubId) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]))
  res.json({
    source: SOURCE, competition: season.competition.name, season: season.name, matchday: null, frozenAt: null,
    standings: rows.map((r) => ({ ...r, club: clubs.get(r.clubId) ?? '?' })), leaders: null,
  })
})

// GET /football/clubs/:id/squad — the club's players with their current-season line and card
router.get('/clubs/:id/squad', async (req: Request, res: Response) => {
  const clubId = parseInt(req.params.id, 10)
  if (isNaN(clubId)) { res.status(400).json({ error: 'Invalid club id' }); return }
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true, name: true } })
  if (!club) { res.status(404).json({ error: 'Club not found' }); return }
  const stats = await prisma.playerSeasonStat.findMany({
    where: { clubId, season: { isCurrent: true } },
    include: { player: { select: { id: true, name: true, positionGroup: true, shirtNumber: true, age: true, nationality: true } }, season: { select: { id: true, competition: { select: { name: true } } } } },
    orderBy: { minutes: 'desc' },
  })
  const cards = new Map<string, SnapshotPayload['cards'][number]>()
  for (const seasonId of new Set(stats.map((s) => s.seasonId))) {
    const snap = await latestSnapshot(seasonId)
    for (const c of snap?.payload.cards ?? []) cards.set(`${seasonId}:${c.playerId}`, c)
  }
  cacheUntilNextGameweek(res)
  res.json({
    source: SOURCE,
    club,
    players: stats.map((s) => ({
      ...s.player,
      competition: s.season.competition.name,
      appearances: s.appearances, minutes: s.minutes, goals: s.goals, assists: s.assists, rating: s.rating,
      card: cards.get(`${s.seasonId}:${s.playerId}`) ?? null,
    })),
  })
})

// GET /football/players/:id — profile, current-season lines per competition, and cards
router.get('/players/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid player id' }); return }
  const player = await prisma.player.findUnique({
    where: { id },
    select: { id: true, name: true, age: true, nationality: true, positionGroup: true, dateOfBirth: true, heightCm: true, preferredFoot: true, shirtNumber: true, currentClubId: true },
  })
  if (!player) { res.status(404).json({ error: 'Player not found' }); return }
  const seasons = await prisma.playerSeasonStat.findMany({
    where: { playerId: id },
    include: { season: { select: { id: true, name: true, isCurrent: true, competition: { select: { id: true, name: true } } } } },
    orderBy: { season: { startYear: 'desc' } },
  })
  const lines = []
  for (const s of seasons) {
    const snap = await latestSnapshot(s.seasonId)
    lines.push({
      competition: s.season.competition, season: s.season.name, current: s.season.isCurrent, clubId: s.clubId,
      appearances: s.appearances, starts: s.starts, minutes: s.minutes, goals: s.goals, assists: s.assists, xg: s.xg, xa: s.xa, rating: s.rating,
      detail: s.detail,
      card: snap?.payload.cards.find((c) => c.playerId === id) ?? null,
    })
  }
  cacheUntilNextGameweek(res)
  res.json({ source: SOURCE, player, seasons: lines })
})

// GET /football/competitions/:id/fixtures?matchday=N — fixtures for a matchday (default: the latest played)
router.get('/competitions/:id/fixtures', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid competition id' }); return }
  const season = await prisma.season.findFirst({ where: { competitionId: id, isCurrent: true, competition: { tracked: true } } })
  if (!season) { res.status(404).json({ error: 'Competition not found' }); return }
  let matchday = req.query.matchday != null ? parseInt(String(req.query.matchday), 10) : NaN
  if (isNaN(matchday)) {
    const latest = await prisma.fixture.findFirst({ where: { seasonId: season.id, status: 'finished' }, orderBy: { kickoffAt: 'desc' }, select: { matchday: true } })
    matchday = latest?.matchday ?? 1
  }
  const fixtures = await prisma.fixture.findMany({ where: { seasonId: season.id, matchday }, orderBy: { kickoffAt: 'asc' } })
  const clubs = new Map((await prisma.club.findMany({ where: { id: { in: fixtures.flatMap((f) => [f.homeClubId, f.awayClubId]).filter((c): c is number => c != null) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]))
  cacheUntilNextGameweek(res)
  res.json({
    source: SOURCE, matchday,
    fixtures: fixtures.map((f) => ({
      id: f.id, kickoffAt: f.kickoffAt, status: f.status, hasDetail: f.detailFetchedAt != null,
      home: { id: f.homeClubId, name: f.homeClubId ? clubs.get(f.homeClubId) ?? '?' : '?', goals: f.homeGoals },
      away: { id: f.awayClubId, name: f.awayClubId ? clubs.get(f.awayClubId) ?? '?' : '?', goals: f.awayGoals },
    })),
  })
})

// GET /football/matches/:id — one match: score, lineups, key events, team stats, player lines, shots
router.get('/matches/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid match id' }); return }
  const f = await prisma.fixture.findUnique({ where: { id }, include: { detail: true, season: { select: { name: true, competition: { select: { id: true, name: true } } } } } })
  if (!f) { res.status(404).json({ error: 'Match not found' }); return }
  const clubs = new Map((await prisma.club.findMany({ where: { id: { in: [f.homeClubId, f.awayClubId].filter((c): c is number => c != null) } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]))
  // Link provider player ids to Gallia players, so the page can link to /player/[id].
  const tsaIds = ((f.detail?.playerStats as { playerId: string }[] | undefined) ?? []).map((p) => p.playerId)
  const players = tsaIds.length ? await prisma.player.findMany({ where: { tsaPlayerId: { in: tsaIds } }, select: { id: true, tsaPlayerId: true } }) : []
  cacheUntilNextGameweek(res)
  res.json({
    source: SOURCE,
    match: {
      id: f.id, competition: f.season.competition, season: f.season.name, matchday: f.matchday, kickoffAt: f.kickoffAt, status: f.status,
      home: { id: f.homeClubId, name: f.homeClubId ? clubs.get(f.homeClubId) ?? '?' : '?', goals: f.homeGoals },
      away: { id: f.awayClubId, name: f.awayClubId ? clubs.get(f.awayClubId) ?? '?' : '?', goals: f.awayGoals },
    },
    galliaPlayerIds: Object.fromEntries(players.map((p) => [p.tsaPlayerId, p.id])),
    detail: f.detail ? { lineups: f.detail.lineups, events: f.detail.events, teamStats: f.detail.teamStats, playerStats: f.detail.playerStats, shots: f.detail.shots } : null,
  })
})

export default router
