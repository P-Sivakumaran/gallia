/**
 * GET /map — clubs placed by location, plus rumour routes between them.
 *
 * Club coordinates come from the Wikidata club sync (CC0). A rumour is a
 * route only when both clubs are placed; otherwise it is listed in
 * `unplaced` with the reason, so the UI can show it beside the map.
 * ?include=feed adds Sportmonks-feed-only transfers, as on /graph.
 */
import { Router, type Request, type Response } from 'express'
import { PrismaClient, RumourStatus, type Club } from '@prisma/client'
import { NOT_VOIDED } from '../ingestion/outcomeDetector.js'
import { isPlaceholderClub, rumourKind } from './graph.js'

const router = Router()
const prisma = new PrismaClient()

const MAP_STATUSES = [RumourStatus.PENDING, RumourStatus.HOT, RumourStatus.COMPLETED, RumourStatus.FAILED]
const OPEN = new Set<RumourStatus>([RumourStatus.PENDING, RumourStatus.HOT])

type MapClub = Pick<Club, 'id' | 'name' | 'shortName' | 'country' | 'league' | 'city' | 'stadium' | 'lat' | 'lng' | 'isPlaceholder'>

export interface MapRumour {
  id: number
  status: RumourStatus
  computedLikelihood: number
  player: { id: number; name: string }
  source: { name: string }
  fromClub: MapClub
  toClub: MapClub
}

const placed = (c: MapClub) => !isPlaceholderClub(c) && c.lat != null && c.lng != null

export function buildMap(rumours: MapRumour[], includeFeed: boolean) {
  const clubs = new Map<number, ReturnType<typeof clubOut>>()
  const routes: object[] = []
  const unplaced: object[] = []
  let feedHidden = 0

  function clubOut(c: MapClub) {
    return {
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      country: c.country,
      league: c.league,
      city: c.city,
      stadium: c.stadium,
      lat: c.lat as number,
      lng: c.lng as number,
      rumourCount: 0,
      openRumourCount: 0,
    }
  }
  const touch = (c: MapClub, status: RumourStatus) => {
    let out = clubs.get(c.id)
    if (!out) clubs.set(c.id, (out = clubOut(c)))
    out.rumourCount++
    if (OPEN.has(status)) out.openRumourCount++
  }

  for (const r of rumours) {
    const kind = rumourKind(r.source)
    if (kind === 'feed' && !includeFeed) {
      feedHidden++
      continue
    }
    const fromOk = placed(r.fromClub)
    const toOk = placed(r.toClub)
    if (fromOk) touch(r.fromClub, r.status)
    if (toOk) touch(r.toClub, r.status)

    const base = { rumourId: r.id, kind, status: r.status, likelihood: r.computedLikelihood, player: r.player }
    if (fromOk && toOk) {
      routes.push({ ...base, fromClubId: r.fromClub.id, toClubId: r.toClub.id })
    } else {
      const reason = isPlaceholderClub(r.toClub) ? 'destination-unknown' : isPlaceholderClub(r.fromClub) ? 'origin-unknown' : 'no-coordinates'
      unplaced.push({
        ...base,
        from: isPlaceholderClub(r.fromClub) ? null : { id: r.fromClub.id, name: r.fromClub.name },
        to: isPlaceholderClub(r.toClub) ? null : { id: r.toClub.id, name: r.toClub.name },
        reason,
      })
    }
  }

  return {
    clubs: [...clubs.values()],
    routes,
    unplaced,
    meta: {
      clubCount: clubs.size,
      routeCount: routes.length,
      unplacedCount: unplaced.length,
      feedHidden,
      attribution: 'Club locations: Wikidata (CC0)',
    },
  }
}

const CLUB_SELECT = {
  id: true, name: true, shortName: true, country: true, league: true, city: true, stadium: true, lat: true, lng: true, isPlaceholder: true,
} as const

router.get('/', async (req: Request, res: Response) => {
  const includeFeed = String(req.query.include ?? '').split(',').includes('feed')
  const rumours = await prisma.rumour.findMany({
    where: { status: { in: MAP_STATUSES }, ...NOT_VOIDED },
    select: {
      id: true,
      status: true,
      computedLikelihood: true,
      player: { select: { id: true, name: true } },
      source: { select: { name: true } },
      fromClub: { select: CLUB_SELECT },
      toClub: { select: CLUB_SELECT },
    },
    orderBy: { computedLikelihood: 'desc' },
    take: 300,
  })
  res.json(buildMap(rumours, includeFeed))
})

export default router
