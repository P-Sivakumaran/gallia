/**
 * npm run sync:football-data [-- --only standings,squads] [--teams 10] | [-- --tick]
 * Phase 1 of docs/football-data-plan.md. Paced and quota-guarded: safe to rerun; it stops on its
 * own at the daily allowance or the monthly reserve. The API key comes from STATS_API_KEY or,
 * failing that, the Keychain (service overround-stats-api) at run time; it is never logged.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { pacedClient } from '../footballData/factory.js'
import { runFootballDataSync, type FootballSyncOptions } from '../footballData/sync.js'
import { runFootballTick } from '../footballData/tick.js'

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name)
    return i > -1 ? process.argv[i + 1] : undefined
  }
  const only = arg('--only')?.split(',').filter(Boolean) as FootballSyncOptions['only']
  const teams = arg('--teams')
  const prisma = new PrismaClient()
  try {
    const api = await pacedClient(prisma)
    if (process.argv.includes('--tick')) {
      console.log('[football-data] tick', await runFootballTick(prisma, api, Date.now(), (m) => console.log(`[football-data] ${m}`)))
      return
    }
    const summary = await runFootballDataSync(prisma, api, {
      only,
      teamLimit: teams ? Number(teams) : undefined,
      log: (m) => console.log(`[football-data] ${m}`),
    })
    console.log('[football-data] done', summary)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
