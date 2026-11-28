/**
 * Ingest listed-club filings into the transfer ledger (AMF + Juventus IR).
 * Idempotent. Usage:
 *   npm run filings:ingest
 *   npm run filings:ingest -- --skip-juventus
 *   npm run filings:ingest -- --amf-since 2025-06-01
 */
import { PrismaClient } from '@prisma/client'
import { runListedClubFilingsIngest } from '../transfers/filings/runner.js'

function flag(name: string): boolean {
  return process.argv.includes(name)
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const db = new PrismaClient()
  const amfSinceRaw = argValue('--amf-since')
  const summary = await runListedClubFilingsIngest(db, {
    skipAmf: flag('--skip-amf'),
    skipJuventus: flag('--skip-juventus'),
    amfSince: amfSinceRaw ? new Date(amfSinceRaw) : undefined,
  })

  console.log(
    `[filings:ingest] facts=${summary.facts} applied=${summary.applied} unmatched=${summary.unmatched} errors=${summary.errors}`
  )
  for (const [portal, s] of Object.entries(summary.byPortal)) {
    console.log(`  ${portal}: facts=${s.facts} applied=${s.applied} unmatched=${s.unmatched} errors=${s.errors}`)
  }
  await db.$disconnect()
}

main().catch(async (err) => {
  console.error('[filings:ingest] failed:', err)
  process.exit(1)
})
