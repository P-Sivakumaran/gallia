/**
 * Dry run: list and parse a listed club's player filings from its cleared regulator channel
 * (info-financiere.gouv.fr for French clubs, Finanstilsynet OAM for Danish ones).
 * Reads only; writes nothing to the DB. Usage: npm run filings:dry-run -- [portalId] [since YYYY-MM-DD]
 */
import { AMF_ISSUERS, fetchAmfFacts } from '../transfers/filings/amfFrance.js'
import { DK_ISSUERS, fetchDkFacts } from '../transfers/filings/dkOam.js'

const eur = (n: number | null | undefined) => (n == null ? '-' : `€${(n / 1_000_000).toFixed(1)}m`)
const profit = (p: unknown) => {
  const x = p as { amount: number; currency: string; year: number } | null | undefined
  return x ? `${x.currency} ${(x.amount / 1_000_000).toFixed(0)}m (${x.year})` : '-'
}
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '-')

async function main() {
  const portalId = process.argv[2] ?? 'lyon_eagle'
  const since = new Date(process.argv[3] ?? '2025-06-01')
  console.log(`Filings dry run: ${portalId}, filings since ${day(since)} (2 s between requests)\n`)

  const run = AMF_ISSUERS[portalId] ? fetchAmfFacts : DK_ISSUERS[portalId] ? fetchDkFacts : null
  if (!run) throw new Error(`No cleared channel parser for portal "${portalId}"`)
  const { announcements, facts, failures } = await run(portalId, since)

  console.log(`Player filings found: ${announcements.length}`)
  console.log(`Parsed: ${facts.length}`)
  console.log(`With fee: ${facts.filter((f) => f.feeAmount != null).length}`)
  console.log(`With contract end: ${facts.filter((f) => f.contractExpiresOn).length}\n`)

  console.log('| Date | Player | Counterparty | Direction | Type | Fee | Add-ons | Sell-on | Contract end | Loan until | Profit impact |')
  console.log('|---|---|---|---|---|---|---|---|---|---|---|')
  for (const f of facts) {
    console.log(
      `| ${day(f.publishedAt)} | ${f.playerName} | ${f.counterpartyName ?? '-'} | ${f.direction} | ${f.transferType}${f.loanOptionOrObligation !== 'none' ? ` (${f.loanOptionOrObligation})` : ''} | ${eur(f.feeAmount)} | ${eur(f.addOnsAmount)} | ${f.sellOnPercent != null ? `${f.sellOnPercent}%` : '-'} | ${day(f.contractExpiresOn)} | ${(f.details.loanUntil as string | null) ?? '-'} | ${profit(f.details.profitBeforeTaxImpact)} |`
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
