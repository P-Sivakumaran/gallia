/**
 * npm run sync:football-data [-- --only standings,squads] [--teams 10]
 * Phase 1 of docs/football-data-plan.md. Paced and quota-guarded: safe to rerun; it stops on its
 * own at the daily allowance or the monthly reserve. The API key comes from STATS_API_KEY or,
 * failing that, the Keychain (service overround-stats-api) at run time; it is never logged.
 */
import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { TheStatsApiClient } from '../footballData/client.js'
import { runFootballDataSync, type FootballSyncOptions } from '../footballData/sync.js'

function apiKey(): string {
  if (process.env.STATS_API_KEY) return process.env.STATS_API_KEY
  try {
    return execFileSync('security', ['find-generic-password', '-a', process.env.USER ?? '', '-s', 'overround-stats-api', '-w'], { encoding: 'utf8' }).trim()
  } catch {
    throw new Error('No STATS_API_KEY and no Keychain item overround-stats-api')
  }
}

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name)
    return i > -1 ? process.argv[i + 1] : undefined
  }
  const only = arg('--only')?.split(',').filter(Boolean) as FootballSyncOptions['only']
  const teams = arg('--teams')
  const prisma = new PrismaClient()
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const [spentToday, last] = await Promise.all([
      prisma.providerRequest.count({ where: { provider: 'thestatsapi', at: { gte: startOfDay } } }),
      prisma.providerRequest.findFirst({ where: { provider: 'thestatsapi', quotaRemaining: { not: null } }, orderBy: { at: 'desc' } }),
    ])
    const api = new TheStatsApiClient({
      apiKey: apiKey(),
      state: { spentToday, quotaRemaining: last?.quotaRemaining ?? null, quotaResetAt: last?.quotaResetAt ?? null },
      record: async (r) => {
        await prisma.providerRequest.create({ data: { provider: 'thestatsapi', ...r } })
      },
    })
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
