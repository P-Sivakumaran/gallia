/**
 * Dry run: list and parse a French listed club's player filings from info-financiere.gouv.fr.
 * Reads only; writes nothing to the DB. Usage: npm run filings:dry-run-amf -- [portalId] [since YYYY-MM-DD]
 */
import { fetchAmfFacts } from '../transfers/filings/amfFrance.js'

const eur = (n: number | null | undefined) => (n == null ? '-' : `€${(n / 1_000_000).toFixed(1)}m`)
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '-')

async function main() {
  const portalId = process.argv[2] ?? 'lyon_eagle'
  const since = new Date(process.argv[3] ?? '2025-06-01')
  console.log(`AMF dry run: ${portalId}, filings since ${day(since)} (2 s between requests)\n`)

  const { announcements, facts, failures } = await fetchAmfFacts(portalId, since)

  console.log(`Player filings found: ${announcements.length}`)
  console.log(`Parsed: ${facts.length}`)
  console.log(`With fee: ${facts.filter((f) => f.feeAmount != null).length}`)
  console.log(`With contract end: ${facts.filter((f) => f.contractExpiresOn).length}\n`)

  console.log('| Date | Player | Counterparty | Direction | Type | Fee | Add-ons | Sell-on | Contract end | Loan until |')
  console.log('|---|---|---|---|---|---|---|---|---|---|')
  for (const f of facts) {
    console.log(
      `| ${day(f.publishedAt)} | ${f.playerName} | ${f.counterpartyName ?? '-'} | ${f.direction} | ${f.transferType}${f.loanOptionOrObligation !== 'none' ? ` (${f.loanOptionOrObligation})` : ''} | ${eur(f.feeAmount)} | ${eur(f.addOnsAmount)} | ${f.sellOnPercent != null ? `${f.sellOnPercent}%` : '-'} | ${day(f.contractExpiresOn)} | ${(f.details.loanUntil as string | null) ?? '-'} |`
    )
  }
  if (failures.length) {
    console.log('\nNot parsed:')
    for (const x of failures) console.log(`- ${x.title}: ${x.error}`)
  }
}

main().catch((err) => {
  console.error('Dry run failed:', err)
  process.exit(1)
})
