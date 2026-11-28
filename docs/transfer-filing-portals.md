# Listed-club filing portals

Transfer fees, add-ons, sell-ons and contract ends from listed clubs' regulatory filings
(transfer ledger phase 2, `backend/src/transfers/filings/`).

## Policy (owner 2026-11-28)

**Model-first.** Maximize filing facts for the transfer ledger and fee model. Terms
`access` labels on each channel remain a factual survey, but HTTP no longer refuses
non-CLEARED channels. Prefer official regulator storage (OAM) when it works; club IR
sites and other hosts on the channel allow-list may be fetched for private modeling.

`portals.ts` records every channel with status and quoted wording. The shared HTTP client
(`http.ts`) requires a known channel and an allow-listed host, rate-limits per host (2 s),
and warns when `access !== CLEARED`. User-Agent:
`Gallia transfer research (+https://github.com/P-Sivakumaran/gallia)`.

Ledger write path: `npm run filings:ingest` (or daily scheduler cron `FILINGS_INGEST_CRON`,
default `15 3 * * *`) runs AMF + Juventus fetchers through `runListedClubFilingsIngest` →
`ingestFilingFact`. Idempotent; unmatched players go to admin review.

Statuses (factual only — not fetch bans):
- **CLEARED**: terms or an open licence allow automated reuse of the facts.
- **BLOCKED**: terms ban bots/scraping, or the site often blocks automated clients.
- **NEEDS_PERMISSION**: personal/non-commercial wording or consent required for public reuse.
- **UNKNOWN**: terms couldn't be read yet.

## Clubs (surveyed 2026-11-28)

| Club | Channel | Terms status | Built |
|---|---|---|---|
| Olympique Lyonnais (Eagle Football Group) | info-financiere.gouv.fr (DILA) | CLEARED | Parser + fetcher |
| Manchester United | SEC EDGAR | CLEARED | Needs Keychain contact; check 6-K/20-F naming |
| Juventus | juventus.com IR (1Info preferred later) | BLOCKED (terms) | Parser + fetcher (model-first); `npm run filings:dry-run-juventus` |
| Lazio | 1Info / club site | UNKNOWN / BLOCKED (terms) | No |
| Benfica, FC Porto, Sporting CP | CMVM / club sites | UNKNOWN / NEEDS_PERMISSION | No |
| Ajax | AFM / club site | UNKNOWN / NEEDS_PERMISSION | No |
| Borussia Dortmund | Unternehmensregister | UNKNOWN | No |
| FC Copenhagen (Parken) | Finanstilsynet OAM | UNKNOWN | See PR #113 if merged |
| Celtic | FCA NSM / club | BLOCKED (terms) | Modeling fetch allowed; expect friction |
| Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor | KAP | BLOCKED (edge) | Modeling fetch allowed; may need MKK feed |

## Next (coverage)

1. Reattach remaining club/regulator fetchers where parsers already exist (Lazio, CMVM, KAP…).
2. Clear UNKNOWN channels by reading terms in a browser — for the record, not as a stop.
3. SEC / Manchester United once the contact is in the Keychain.
4. ESAP when live for one EU machine-readable route.
