import { PrismaClient } from '@prisma/client'
import { rumourInclude, withPublicNotes } from './rumoursService.js'
import { NOT_VOIDED } from '../ingestion/outcomeDetector.js'

const prisma = new PrismaClient()

export async function getPlayerById(id: number) {
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      currentClub: true,
      rumours: {
        where: NOT_VOIDED,
        include: rumourInclude,
        orderBy: { rumourDate: 'desc' },
      },
    },
  })
  return player && { ...player, rumours: player.rumours.map(withPublicNotes) }
}

export async function searchPlayers(query: string) {
  return prisma.player.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    include: { currentClub: true },
    take: 20,
  })
}
