# Data sources: model-first ingest

**Owner decision 2026-11-28:** Gallia is private model-building for now. Maximize useful
transfer, rumour and filing data before diminishing returns. Public-facing commercial
display and licence gates are **deferred** until a launch decision. This file keeps
provider facts as reference; it does **not** ban collectors from running.

Re-check terms only when preparing a public site, ads, or paid redistribution.

## Policy (now)

1. **Ingest for the model.** RSS, APIs, filings, Wikidata, Wikipedia leads, and primary
   disclosures are in scope when they improve forecasts or the transfer ledger.
2. **Prefer high-signal, low-friction sources** until coverage plateaus (diminishing returns).
3. **Do not block collectors** on PERSONAL_ONLY / NEEDS_LICENCE labels. The source registry
   still records entries; statuses are CLEARED for modeling (Sportmonks remains product-retired).
4. **Public launch later.** Paid TheStatsAPI, licensed news APIs, and display rights return as
   an explicit launch checklist — not as a daily ingest stop.

## Gallia today (reference)

| Source | Use | Cost | Notes for later public launch |
|---|---|---|---|
| TheStatsAPI | Player current club, squads, values | Free tier ~500 req/day; Starter $50/mo | Upgrade before public commercial use; confirm display in writing. |
| Google News RSS (4 feeds) | Article discovery | Free | Personal/non-commercial in Google's terms; fine for private modeling. |
| Publisher RSS (BBC, Guardian, Sky, ESPN, Marca, L'Équipe, …) | Article discovery | Free | Commercial reuse often restricted; modeling ingest allowed. |
| Wikidata | Player enrichment, careers | Free CC0 | Clean for any use. |
| Listed-club filings | Fees, contracts | Free | Prefer regulator OAMs; club sites OK for modeling when fetch works. |
| Sportmonks | (off since 2026-11-25) | €29–€249/mo | Retired by product choice, not a terms gate. |
| API-Football | (no key) | $0–$39/mo | Optional if keys appear; useful for coverage tests. |

## Transfer-data APIs (coverage first)

For **private modeling**, Transfermarkt-derived APIs and scrapers are no longer treated as
hard "avoid" bans. Prefer primary filings and cited news when quality matters; use denser
feeds when they move the error needle. Before any **public** republication of substantial
Transfermarkt-derived tables, re-read EU database rights and their terms.

Candidates to try for volume: sportapidata.com, thesports.com, steadyapi.com, open wrappers —
evaluate coverage vs noise, not licence theatre, until launch.

## Overround (unchanged here)

Overround has its own gates (operator auth, enriched scanner env). See that repo. Betfair /
odds sources stay personal-trading scoped unless Overround policy changes separately.
