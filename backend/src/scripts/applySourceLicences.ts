/**
 * npm run sources:licences
 * Writes the licence registry (src/sources/licences.ts) to existing source rows, matched by name.
 * Patches rows in place; never creates or deletes sources.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { applySourceLicences } from '../sources/licences.js'

async function main() {
  const prisma = new PrismaClient()
  try {
    const { updated, missing } = await applySourceLicences(prisma)
    console.log(`[sources:licences] updated ${updated} source rows`)
    if (missing.length) console.log(`[sources:licences] no row yet for: ${missing.join(', ')}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
