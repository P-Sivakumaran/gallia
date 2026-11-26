/**
 * npm run sync:wikidata-clubs [-- --limit 50] [--recheck]
 * Places clubs on the map from Wikidata (CC0). Safe to rerun: clubs already
 * placed, or checked in the last 30 days, are skipped (--recheck retries every unplaced club).
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { runWikidataClubSync } from '../ingestion/wikidataClubSync.js'

async function main() {
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : undefined
  const prisma = new PrismaClient()
  try {
    const recheck = process.argv.includes('--recheck')
    const summary = await runWikidataClubSync(prisma, { limit, recheck, log: (m) => console.log(`[wikidataClubSync] ${m}`) })
    console.log('[wikidataClubSync] done', summary)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
