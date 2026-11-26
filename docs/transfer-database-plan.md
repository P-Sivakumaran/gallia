# Transfer, value and contract database: plan (draft, 2026-11-26)

## Goal

A transfer, market-value and contract database that reaches Transfermarkt's coverage and then surpasses it, built only from licensed, open or primary sources.

## What "surpass" means

| | Transfermarkt | Gallia target |
|---|---|---|
| Sourcing | Uncited community entries | Every transfer, fee and contract fact cites its source (article, club or exchange filing, open data) and shows how confident we are |
| Values | Crowd estimate, updated a few times a year, a single number | **Gallia Value**: model estimate with a range, its main drivers, and history updated every gameweek |
| Rumour to transfer | Separate | Linked: a rumour's credibility score, the journalists who called it, then the completed move and its fee |
| Agents | Listed, uncited | Cited agent links (already built, PR #35) |
| Contracts | Expiry date | Expiry plus extensions detected over time, with option and release-clause facts when cited |
| Freshness | Edited by hand | Squad changes detected weekly from TheStatsAPI, fees from cited news as they land |

**Out of bounds:**
- Transfermarkt and its resellers: its terms (clause 11.1) ban bots and copying.
- SofaScore, FotMob, FBref: their terms forbid scraping.
- EA FC ratings: EA's own work.

## Sources (checked 2026-11-26)

| Source | Gives | Licence | Coverage |
|---|---|---|---|
| **Wikidata** P54 "member of sports team" with start and end qualifiers | Career history: every club spell, with dates | CC0 | Strong. All 8 sampled stars have every spell dated (start 100%, end on every finished spell). **No fees** (P2130 never set). |
| **TheStatsAPI** squads | Current club, contract expiry, provider market value, shirt, position | Paid plan; display in own app; no bulk redistribution | Contract expiry for 2,176 of 2,393 linked squad players |
| **TheStatsAPI** weekly squad diff | Detects moves and contract extensions as they happen | as above | Top 5 leagues plus the Champions League, growing |
| **Gallia rumours and outcomes** | Completed moves linked to their rumour history, and fees quoted in cited articles | Own data plus citations | Grows with the news scanner |
| **Listed-club filings** (Juventus IR, KAP for Galatasaray, Fenerbahçe, Beşiktaş and Trabzonspor, likely CONSOB, CMVM, Euronext, SEC for Man Utd) | Club-declared fees, add-ons, sometimes contract length | Primary public disclosure; store our own extracted facts with the filing reference, never mirror documents | Material transfers of about 15 clubs |
| **Wikipedia** "List of … football transfers <window>" | Fees, dates and the news citations behind them | CC BY-SA 4.0 | Big-5 summer 2026 pages exist (256–391 KB each) |
| **FIFA Global Transfer Report** | League and country totals | Aggregate only | For validating our totals, not per player |

### Wikipedia: the share-alike question (decision for Siva)

- Single facts (fee, date, clubs) aren't copyrightable.
- Extracting a substantial part of Wikipedia's tables into our own database, which is protected by EU database right, would make our database share-alike (CC BY-SA 4.0 §4).

The options:
- **A. Lead source only (recommended).** Use Wikipedia to find transfers and the news articles they cite. Store each fact with the article as its citation, verified against the article, the club or an exchange filing. Never bulk-copy tables.
- **B. CC BY-SA ledger.** Import the tables with attribution and publish Gallia's transfer ledger under CC BY-SA. Faster coverage, but others may reuse our ledger.

## Data model (one migration)

- **`Transfer`**:
  - player, from-club and to-club;
  - date and window;
  - type: permanent, loan, loan end, free, or end of contract;
  - fee: amount, currency, and status (disclosed, reported, undisclosed or free);
  - add-ons, sell-on percentage, loan option or obligation.
  - Every field is backed by `SourcedFact` rows, the same pattern as club locations and agents.
- **`ContractFact`**: player, club, signed and expires dates, plus extension, option and release clause when cited. History is kept, so extensions show up as a new expiry.
- **`ValueEstimate`**: player, as-of gameweek, value, low and high band, model version, and the top drivers. One row per player per gameweek snapshot, which gives value history.
- **`ProviderValue`** (TheStatsAPI market value, stored as given): a benchmark and model feature. Whether it's shown publicly is a decision for Siva.

## Gallia Value model

**Features** (all from licensed data):
- age and position;
- contract months remaining;
- minutes and starts share;
- Gallia card attributes and the provider rating;
- league strength (from standings and UEFA coefficients);
- club strength;
- international caps (Wikidata);
- recent form (gameweek snapshots).

**Training and quality bar:**
- Train on fees in the transfer ledger: disclosed or credibly reported fees, adjusted for inflation by window.
- Use comparables (similar age, position and league) for the explanation.
- Output a value with an 80% interval and its top 3 drivers ("age 22 +", "contract < 1 year −").
- Backtest on held-out windows, scoring median absolute percentage error against actual fees, and compare with the provider value. Publish the method and the error on a methodology page; Transfermarkt doesn't.
- v1 is gradient-boosted trees or a regularised regression. Brand (the OpenMausBot quant agent) or Claude Code can run the walk-forward backtest.

## Phases and agents

| Phase | Work | Who |
|---|---|---|
| 1 | Schema; Wikidata career import (CC0) into transfer events with dates; TheStatsAPI squad diff (moves and extensions); store provider values and contracts | Claude Code |
| 2 | Fees: listed-club filings (KAP, Juventus IR and so on); fees from cited articles via the news scanner's claim extraction; Wikipedia per the decision above; admin review queue for conflicting facts | Antigravity (filings, Wikipedia), Claude Code (extraction, review), Perplexity (map each listed club's filing portal and terms) |
| 3 | Gallia Value v1: features, training, backtest, methodology page | Claude Code; Brand for the backtest if connected |
| 4 | Pages with Hallmark: player transfer timeline, contract and value chart; club window ledger (in, out, net); league window lists; expiring contracts; most valuable, with ranges | Cursor and Antigravity |
| 5 | Grow coverage: more leagues, earlier windows (two seasons back, per TheStatsAPI terms), women's football | everyone |

**Tools:**
- **Scrapling:** only for filing portals and pages whose terms allow automated access. KAP is free to access; check each portal's terms first.
- **Crawl4AI:** the same rule.
- **Hallmark and Galaxy:** the pages.
- **Hugging Face models:** optional, for fee and contract extraction alongside the LLM claim extraction.
- **crosswalk:** tasks, review hand-offs and digests.

## Decisions (Siva, 2026-11-26)

1. **Wikipedia: lead source only (A).** We find transfers and their cited articles through it, store facts with the article as citation, and never bulk-copy tables.
2. **TheStatsAPI market value: internal benchmark only.** It's a model feature and backtest target. Pages show Gallia Value with its range and drivers.
3. **Phase 1 approved.** Claude Code builds it; the migration PR is Siva's to merge.
