/**
 * Dry run: list and parse Juventus IR price-sensitive player filings.
 * Reads only; writes nothing to the DB.
 * Usage: npm run filings:dry-run-juventus -- [season-a] [season-b] ...
 */
import { fetchJuventusAnnouncements } from '../transfers/filings/juventus.js'

const eur = (n: number | null | undefined) =>
  n == null ? '-' : n === 0 ? 'Free' : `€${(n / 1_000_000).toFixed(1)}m`
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '-')

async function main() {
  const seasons = process.argv.slice(2)
  const list = seasons.length > 0 ? seasons : ['season-2026-27', 'season-2025-26']
  console.log(`Juventus IR dry run: seasons ${list.join(', ')} (≥2 s between requests)\n`)

  const { announcements, facts, failures } = await fetchJuventusAnnouncements(list, 5)

  console.log(`Corporate announcements inspected: ${announcements.length}`)
  console.log(`Transfer facts parsed:            ${facts.length}`)
  console.log(`With fee:                          ${facts.filter((f) => f.feeAmount != null).length}`)
  console.log(`With contract end:                 ${facts.filter((f) => f.contractExpiresOn).length}\n`)

  console.log('| Date | Player | Counterparty | Direction | Type | Fee | Instalments | Add-ons | Contract end | Title |')
  console.log('|---|---|---|---|---|---|---|---|---|---|')
  for (const f of facts) {
    const dateStr = day(f.effectiveDate ?? f.publishedAt)
    const instStr = f.instalmentYears ? `${f.instalmentYears} yrs` : (f.instalments ?? '-')
    console.log(
      `| ${dateStr} | ${f.playerName} | ${f.counterpartyName ?? '-'} | ${f.direction} | ${f.transferType}${f.isLoan ? ' (loan)' : ''} | ${eur(f.feeAmount)} | ${instStr} | ${eur(f.addOnsAmount)} | ${day(f.contractExpiresOn)} | ${f.title} |`
    )
  }
  if (failures.length) {
    console.log('\nNot parsed / fetch issues:')
    for (const x of failures) console.log(`- ${x.title}: ${x.error}`)
  }
}

main().catch((err) => {
  console.error('Dry run failed:', err)
  process.exit(1)
})
