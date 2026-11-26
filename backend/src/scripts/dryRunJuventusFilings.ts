import { fetchJuventusAnnouncements } from '../transfers/filings/juventus.js'

async function main() {
  console.log('Fetching and parsing Juventus IR announcements (seasons 2025/26 & 2026/27)...')
  console.log('Polite mode: >= 2s delay, UA: GalliaTransferBot/1.0\n')

  const { announcements, facts } = await fetchJuventusAnnouncements(['season-2026-27', 'season-2025-26'], 5)

  console.log(`\n================ DRY-RUN RESULTS SUMMARY ================`)
  console.log(`Total corporate announcements inspected: ${announcements.length}`)
  console.log(`Transfer-related announcements parsed:    ${facts.length}`)
  console.log(`Announcements with disclosed fee:       ${facts.filter((f) => f.feeAmount !== null).length}`)
  console.log(`Announcements with contract expiry:     ${facts.filter((f) => f.contractExpiresOn !== null).length}\n`)

  console.log('| Date | Player | Counterparty | Direction | Type | Fee (€m) | Instalments | Add-ons (€m) | Contract End | Title |')
  console.log('|---|---|---|---|---|---|---|---|---|---|')

  for (const fact of facts) {
    const dateStr = fact.effectiveDate ? fact.effectiveDate.toISOString().slice(0, 10) : fact.publishedAt.toISOString().slice(0, 10)
    const feeStr = fact.feeAmount != null ? (fact.feeAmount === 0 ? 'Free' : `€${(fact.feeAmount / 1_000_000).toFixed(1)}m`) : 'N/A'
    const addOnStr = fact.addOnsAmount != null ? `+€${(fact.addOnsAmount / 1_000_000).toFixed(1)}m` : '-'
    const contractStr = fact.contractExpiresOn ? fact.contractExpiresOn.toISOString().slice(0, 10) : '-'
    const instStr = fact.instalmentYears ? `${fact.instalmentYears} yrs` : (fact.instalments ?? '-')
    const counterparty = fact.counterpartyName ?? '-'

    console.log(
      `| ${dateStr} | **${fact.playerName}** | ${counterparty} | ${fact.direction} | ${fact.transferType}${fact.isLoan ? ' (loan)' : ''} | ${feeStr} | ${instStr} | ${addOnStr} | ${contractStr} | ${fact.title} |`
    )
  }

  console.log('\nDry-run completed successfully.')
}

main().catch((err) => {
  console.error('Dry-run execution failed:', err)
  process.exit(1)
})
