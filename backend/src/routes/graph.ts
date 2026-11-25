/**
 * GET /graph — nodes + edges for the Sigma.js transfer network.
 *
 * Nodes: players + clubs. Each rumour is drawn as two edges (from club → player →
 * to club); meta.rumourCount is the number of rumours, not edges.
 *
 * ?include=feed adds rumours that came only from a structured data feed
 * (Sportmonks transfer listings), which have no news report behind them.
 */
import { Router, type Request, type Response } from 'express'
import { PrismaClient, RumourStatus } from '@prisma/client'
import { NOT_VOIDED } from '../ingestion/outcomeDetector.js'

const router = Router()
const prisma = new PrismaClient()

const STATUS_COLORS: Record<RumourStatus, string> = {
  HOT: '#f97316',
  PENDING: '#94a3b8',
  COMPLETED: '#22c55e',
  FAILED: '#ef4444',
  DENIED: '#6b7280',
}

const NODE_COLORS = {
  player: '#60a5fa',
  club: '#8b5cf6',
} as const

const GRAPH_STATUSES = [RumourStatus.PENDING, RumourStatus.HOT, RumourStatus.COMPLETED, RumourStatus.FAILED]

/** Data-feed stand-ins for "destination not known yet" (Sportmonks uses a club called TBC). */
const PLACEHOLDER_CLUB = /^(tbc|tba|unknown|to be confirmed|to be announced)$/i

export function isPlaceholderClub(club: { name: string }): boolean {
  return PLACEHOLDER_CLUB.test(club.name.trim())
}

/** Rumours whose only source is a structured transfer feed, not a news report. */
export function rumourKind(source: { name: string }): 'news' | 'feed' {
  return /^sportmonks/i.test(source.name) ? 'feed' : 'news'
}

/**
 * Deterministic start position for a node, so the force layout settles the
 * same way on every load instead of reshuffling from random seeds.
 */
export function stablePosition(key: string): { x: number; y: number } {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const a = (h >>> 0) / 0xffffffff
  const b = (Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 0xffffffff
  return { x: a * 800, y: b * 600 }
}

router.get('/', async (req: Request, res: Response) => {
  const includeFeed = String(req.query.include ?? '').split(',').includes('feed')

  const rumours = await prisma.rumour.findMany({
    where: { status: { in: GRAPH_STATUSES }, ...NOT_VOIDED },
    include: { player: true, fromClub: true, toClub: true, source: true },
    orderBy: { computedLikelihood: 'desc' },
    take: 200,
  })

  const nodesMap = new Map<string, object>()
  const edges: object[] = []
  let rumourCount = 0
  let feedHidden = 0

  const clubNode = (club: (typeof rumours)[number]['fromClub']) => {
    const key = `club-${club.id}`
    if (!nodesMap.has(key)) {
      nodesMap.set(key, {
        id: key,
        label: club.shortName ?? club.name,
        fullName: club.name,
        type: 'club',
        league: club.league,
        country: club.country,
        size: 14,
        color: NODE_COLORS.club,
        ...stablePosition(key),
      })
    }
    return key
  }

  for (const r of rumours) {
    const kind = rumourKind(r.source)
    if (kind === 'feed' && !includeFeed) {
      feedHidden++
      continue
    }
    rumourCount++

    const playerKey = `player-${r.playerId}`
    if (!nodesMap.has(playerKey)) {
      nodesMap.set(playerKey, {
        id: playerKey,
        label: r.player.name,
        type: 'player',
        position: r.player.position,
        marketValue: r.player.marketValue,
        size: Math.max(6, Math.min(18, (r.player.marketValue ?? 20) / 8)),
        color: NODE_COLORS.player,
        ...stablePosition(playerKey),
      })
    }

    const common = {
      rumourId: r.id,
      kind,
      weight: r.computedLikelihood / 100,
      color: STATUS_COLORS[r.status],
      size: Math.max(1, r.computedLikelihood / 25),
      status: r.status,
      likelihood: r.computedLikelihood,
    }

    // A placeholder club is not a place: leave that end of the rumour undrawn.
    if (!isPlaceholderClub(r.fromClub)) {
      edges.push({
        ...common,
        id: `edge-${r.id}`,
        source: clubNode(r.fromClub),
        target: playerKey,
        type: 'rumour-from',
        label: `${r.player.name} (${Math.round(r.computedLikelihood)}%)`,
      })
    }
    if (!isPlaceholderClub(r.toClub)) {
      edges.push({ ...common, id: `edge-${r.id}-to`, source: playerKey, target: clubNode(r.toClub), type: 'rumour-to' })
    }
  }

  res.json({
    nodes: Array.from(nodesMap.values()),
    edges,
    meta: { nodeCount: nodesMap.size, edgeCount: edges.length, rumourCount, feedHidden },
  })
})

export default router
