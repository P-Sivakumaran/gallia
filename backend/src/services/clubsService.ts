import { PrismaClient, RumourStatus } from '@prisma/client'
import { rumourInclude, withPublicNotes } from './rumoursService.js'
import { NOT_VOIDED } from '../ingestion/outcomeDetector.js'

const prisma = new PrismaClient()

export async function getClubById(id: number) {
  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      players: true,
      rumoursFrom: { where: NOT_VOIDED, include: rumourInclude, orderBy: { computedLikelihood: 'desc' } },
      rumoursTo: { where: NOT_VOIDED, include: rumourInclude, orderBy: { computedLikelihood: 'desc' } },
    },
  })

  if (!club) return null

  const activeStatuses: RumourStatus[] = [RumourStatus.PENDING, RumourStatus.HOT]
  const activeOut = club.rumoursFrom.filter((r) => activeStatuses.includes(r.status)).map(withPublicNotes)
  const activeIn = club.rumoursTo.filter((r) => activeStatuses.includes(r.status)).map(withPublicNotes)

  const totalExpectedSpend = activeIn.reduce((sum, r) => {
    // Midpoint of the reported range ((min ?? 0 + max) / 2 used to parse as min ?? (0 + max)).
    const max = r.reportedFeeMax ?? r.reportedFeeMin
    const midFee = max != null ? ((r.reportedFeeMin ?? max) + max) / 2 : 0
    return sum + midFee * (r.computedLikelihood / 100)
  }, 0)

  return { ...club, activeOut, activeIn, totalExpectedSpend: Math.round(totalExpectedSpend) }
}

export async function listClubs(league?: string) {
  return prisma.club.findMany({
    where: league ? { league: { contains: league, mode: 'insensitive' } } : undefined,
    orderBy: { name: 'asc' },
  })
}
