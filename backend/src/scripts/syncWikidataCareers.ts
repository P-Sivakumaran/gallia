/**
 * npm run sync:wikidata-careers [-- --resolve] [--limit N]
 * --resolve links squad players to Wikidata (date of birth + name) first; then each player's club
 * spells become transfer-ledger moves (CC0). Safe to rerun: moves are deduplicated.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { importCareers, resolvePlayerQids } from '../transfers/wikidataCareers.js'

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : undefined
  const prisma = new PrismaClient()
  const log = (m: string) => console.log(`[wikidata-careers] ${m}`)
  try {
    if (process.argv.includes('--resolve')) log(`resolve done ${JSON.stringify(await resolvePlayerQids(prisma, { limit, log }))}`)
    log(`careers done ${JSON.stringify(await importCareers(prisma, { limit, log }))}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
