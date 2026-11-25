import { NOT_VOIDED } from '../ingestion/outcomeDetector.js'
import { PrismaClient, type Prisma, RumourStatus } from '@prisma/client'

const prisma = new PrismaClient()

export const rumourInclude = {
  player: { include: { currentClub: true } },
  fromClub: true,
  toClub: true,
  source: true,
} satisfies Prisma.RumourInclude

export type RumourWithRelations = Prisma.RumourGetPayload<{ include: typeof rumourInclude }>

export interface RumourFilters {
  league?: string
  clubId?: number
  position?: string
  status?: RumourStatus
  window?: string
  page?: number
  limit?: number
  playerIds?: number[]
}

/**
 * notes holds the source headline, prefixed by owner review tags once a row
 * has been reviewed ("VOID: duplicate of #146 (2026-11-25). [clubs corrected
 * ...] <headline>"). The public API returns the headline only.
 */
export function publicNotes(notes: string | null): string | null {
  if (!notes) return notes
  const stripped = notes
    .replace(/^VOID:.*?\(\d{4}-\d{2}-\d{2}\)\.\s*/, '')
    .replace(/^\[[^\]]*\]\s*/, '')
    .trim()
  return stripped || null
}

function withPublicNotes<T extends { notes: string | null }>(r: T): T {
  return { ...r, notes: publicNotes(r.notes) }
}

export async function listRumours(filters: RumourFilters): Promise<{
  data: RumourWithRelations[]
  total: number
  page: number
  limit: number
}> {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  // Voided rumours (wrong match, duplicate) are not public. AND keeps it apart
  // from the OR used by the club and league filters below.
  const where: Prisma.RumourWhereInput = { AND: [NOT_VOIDED] }

  if (filters.status) where.status = filters.status
  if (filters.window) where.window = filters.window as any
  if (filters.clubId) {
    where.OR = [{ fromClubId: filters.clubId }, { toClubId: filters.clubId }]
  }
  if (filters.league) {
    where.OR = [
      { fromClub: { league: { contains: filters.league, mode: 'insensitive' } } },
      { toClub: { league: { contains: filters.league, mode: 'insensitive' } } },
    ]
  }
  if (filters.position) {
    where.player = { position: filters.position as any }
  }
  if (filters.playerIds) {
    where.playerId = { in: filters.playerIds }
  }

  const [data, total] = await Promise.all([
    prisma.rumour.findMany({
      where,
      include: rumourInclude,
      orderBy: { computedLikelihood: 'desc' },
      skip,
      take: limit,
    }),
    prisma.rumour.count({ where }),
  ])

  return { data: data.map(withPublicNotes), total, page, limit }
}

export async function getRumourById(id: number): Promise<RumourWithRelations | null> {
  const rumour = await prisma.rumour.findUnique({ where: { id }, include: rumourInclude })
  return rumour && withPublicNotes(rumour)
}

export async function getRumourHistory(
  id: number,
): Promise<{ computedLikelihood: number; recordedAt: Date }[]> {
  return prisma.rumourHistory.findMany({
    where: { rumourId: id },
    orderBy: { recordedAt: 'asc' },
    select: { computedLikelihood: true, recordedAt: true },
  })
}

// The raw articles that produced or corroborated this rumour — surfaced so a
// status (PENDING/COMPLETED/...) is always traceable back to source text,
// not a bare number or an unaccountable manual click.
export async function getRumourEvidence(id: number): Promise<
  { sourceName: string; headline: string; link: string; publishedAt: Date }[]
> {
  return prisma.rawSignal.findMany({
    where: { rumourId: id },
    orderBy: { publishedAt: 'desc' },
    select: { sourceName: true, headline: true, link: true, publishedAt: true },
  })
}
