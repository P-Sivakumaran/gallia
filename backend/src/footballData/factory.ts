/**
 * Builds a paced TheStatsAPI client with its state restored from the request log, so a restart
 * doesn't reset today's spend. The key comes from STATS_API_KEY or, failing that, the Keychain
 * (service overround-stats-api) at run time; it is never stored or logged.
 */
import { execFileSync } from 'node:child_process'
import type { PrismaClient } from '@prisma/client'
import { TheStatsApiClient } from './client.js'

export function statsApiKey(): string {
  if (process.env.STATS_API_KEY) return process.env.STATS_API_KEY
  try {
    return execFileSync('security', ['find-generic-password', '-a', process.env.USER ?? '', '-s', 'overround-stats-api', '-w'], { encoding: 'utf8' }).trim()
  } catch {
    throw new Error('No STATS_API_KEY and no Keychain item overround-stats-api')
  }
}

export async function pacedClient(prisma: PrismaClient): Promise<TheStatsApiClient> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const [spentToday, last] = await Promise.all([
    prisma.providerRequest.count({ where: { provider: 'thestatsapi', at: { gte: startOfDay } } }),
    prisma.providerRequest.findFirst({ where: { provider: 'thestatsapi', quotaRemaining: { not: null } }, orderBy: { at: 'desc' } }),
  ])
  return new TheStatsApiClient({
    apiKey: statsApiKey(),
    state: { spentToday, quotaRemaining: last?.quotaRemaining ?? null, quotaResetAt: last?.quotaResetAt ?? null },
    record: async (r) => {
      await prisma.providerRequest.create({ data: { provider: 'thestatsapi', ...r } })
    },
  })
}
