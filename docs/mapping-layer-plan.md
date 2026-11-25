# Mapping layer and Gallia's own reference database — plan (draft, 2026-11-26)

Status: APPROVED by the owner 2026-11-26. Phase 0 is PR #27. Phase 1 (schema, Wikidata club sync, GET /map) is the follow-up PR. The owner said to go ahead without a CHAP attestation, because CHAP was not loaded in this session.

Running the sync: `npm run sync:wikidata-clubs` in backend/ (add `-- --limit 20` for a trial run). It skips clubs that are already placed or were checked in the last 30 days. Matches below 0.75 confidence, or within 0.1 of the runner-up, are stored as unapplied `sourced_facts` rows for review.

## Goal

1. Fix the transfer network on /network.
2. Add a map: every club placed by location, with rumour routes drawn between clubs.
3. Add agent (intermediary) information to players and deals.
4. Build Gallia's own reference database. Every fact keeps where it came from, sources are cross-checked, and nothing depends on a single API.

## What is wrong today (audit 2026-11-26, local DB)

The network is drawn from 55 live rumours, 56 clubs and 50 players.

- **TBC placeholder club.** Sportmonks' "to be confirmed" club (id 92, country "International") is the destination of 12 rumours and an origin once. The graph draws it as a real hub club; on a map it would sit nowhere.
- **Most "rumours" are completed Sportmonks transfers between small UEFA-qualifier clubs** (Moldova, Kazakhstan, Andorra, Georgia…). They have no news headline. They are real transfers, but not rumours. 30 of the 55 are COMPLETED, so the network shows mostly finished deals.
- **Country data is inconsistent:**
  - "Türkiye" and "Turkey" are both used.
  - Crystal Palace, West Ham and Wigan have country "Unknown". They were auto-created by the TheStatsAPI and older syncs.
- **Edge and filter faults:**
  - Each rumour is two edges (from → player → to). The footer halves the edge count to get rumours, which is fragile.
  - The filter has no Failed option, and the legend and colours don't match the status set.
- **Layout:** ForceAtlas2 is run from the backend's random x/y every time, so the layout moves on every load and filter change.

## Proposed data model (Prisma; one migration)

```prisma
model Club {
  // existing fields …
  city        String?
  lat         Float?
  lng         Float?
  stadium     String?
  wikidataId  String?  @unique   // e.g. Q9617 (Arsenal)
  isPlaceholder Boolean @default(false) // TBC / unknown destination
}

model Agent {                      // a licensed football agent or agency
  id          Int      @id @default(autoincrement())
  name        String
  kind        String   // PERSON | AGENCY
  agency      Agent?   @relation("AgencyMembers", fields: [agencyId], references: [id])
  agencyId    Int?
  members     Agent[]  @relation("AgencyMembers")
  fifaLicence String?  @unique   // only from the FIFA register
  wikidataId  String?  @unique
  players     PlayerAgent[]
}

model PlayerAgent {
  playerId  Int
  agentId   Int
  role      String   // REPRESENTS | NEGOTIATED_DEAL
  rumourId  Int?     // when tied to one deal
  validFrom DateTime?
  validTo   DateTime?
  @@id([playerId, agentId, role])
}

/// One row per fact per source. Columns on Club/Agent hold the current best value;
/// this table holds every claim behind it, so sources can be compared.
model SourcedFact {
  id          Int      @id @default(autoincrement())
  entityType  String   // CLUB | PLAYER | AGENT | PLAYER_AGENT
  entityId    Int
  field       String   // lat, lng, city, stadium, agent, …
  value       String
  source      String   // wikidata | fifa-agent-register | thestatsapi | news:<sourceId> | manual
  sourceUrl   String?
  licence     String   // CC0 | public-register | api-paid | quote-only …
  retrievedAt DateTime @default(now())
  confidence  Float    // 0–1
  supersededAt DateTime?
  @@index([entityType, entityId, field])
}
```

Cross-referencing rule: a field's current value is the highest-confidence non-superseded fact. When two sources disagree beyond a set tolerance (for example coordinates more than 5 km apart, or different agents named), the field goes to the existing admin Review tab instead of being overwritten.

## Sources (licence first; see docs/data-sources.md)

| Need | Source | Licence | Notes |
|---|---|---|---|
| Club location, stadium, city | **Wikidata** (P115 venue → P625, P159, P131) | CC0 | Coverage test 2026-11-26: 54 of 57 rumour clubs matched with coordinates and stadium by a naive name search. The misses were Chelsea (search ranking; a better query will fix it), Zira and Yelimay Semey. |
| Club identity cross-check | TheStatsAPI team ids (already stored) | paid plan needed for public use (owner task aqgupa) | |
| Agent licence and identity | **FIFA Agent Platform public register** | public register; reuse terms TBC | Perplexity to confirm the terms. Only licensed agents. |
| Player ↔ agent link | Wikidata P1831 (agent) where present; news evidence (named in a source article, linked through EvidenceItem) | CC0 / quote-only | Shown only with a citation link. |
| Map tiles | MapLibre GL + a tile source whose terms allow public/commercial use (e.g. OpenFreeMap or a paid plan) | varies | OSM's own tile servers forbid heavy or commercial use. |

Not used:
- **Transfermarkt and FBref scraping** (transfermarkt-api, WorldfootballR). Their terms forbid it; this is the same personal-use line PR #22 drew.
- **Username or person-dossier sweeps** (maigret). They profile private individuals and are not appropriate for a public site.

## OSINT tools in the owner's repos (scan 2026-11-26, personal GitHub account only; no orgs)

| Repo | What | Use here |
|---|---|---|
| Trace (fork, dlxarl/Trace) | Local-first investigation platform: entities, links, provenance | **Borrow the patterns** (entity/link/claim-with-source model, timeline). Possibly use it as an internal analyst tool on exported data. Not wired into the public site. |
| maigret (fork) | Builds a dossier on a person from a username | **Not used.** Personal profiling. |
| crawl4ai / crawl4ai-cloud (MCP) | Page → markdown | Only for sources whose terms allow it (Wikipedia/Wikidata, official club and federation press releases). |
| strix, garak (forks) | App and LLM security testing | Security review of the new endpoints only; not data collection. |
| evilginx2, sliver, cameradar (forks) | Phishing, C2, camera intrusion | **Out of scope.** Not OSINT, and never used here. |
| Local football repos (transfermarkt-api, WorldfootballR, mcp-soccer, football-analysis-tool in ~/Documents/src) | Scrapers | iCloud-evicted (unreadable until iCloud re-auth). Scraping licence issue as above. |

## Work plan

**Phase 0 — clean the graph data** (Claude Code; no schema change)
1. Back up the DB.
2. Mark the TBC club as a placeholder, and hide it from graph and map (show "destination unknown").
3. Normalise countries (Türkiye/Turkey) and fill Unknowns.
4. Add a Rumours/Transfers toggle, so feed-only completed transfers don't flood the network.

**Phase 1 — schema + enrichment** (Claude Code; needs CHAP)
1. Migration above.
2. `wikidataClubSync` job: match by name + country + TheStatsAPI id. It writes SourcedFact rows and stores matches below a confidence threshold for review.
3. Admin review of conflicts in the existing Review tab.

**Phase 2 — network fix + map** (Cursor for UI, Claude Code reviews)
1. Network:
   - stable seeded layout;
   - one edge per rumour (from → to, with the player on the edge);
   - Failed filter;
   - click → rumour page.
2. /map:
   - MapLibre, clubs placed by coordinates;
   - rumour routes as arcs coloured by status;
   - clustering for cities with several clubs.
3. A Map/Network toggle on the same page.

**Phase 3 — agents** (Perplexity research, then Claude Code)
1. Perplexity confirms the FIFA register's access and reuse terms.
2. Import licensed agents only, with every PlayerAgent link sourced.
3. Agent page plus an agent filter on map and network.

## Agent assignments (after approval)

- **Antigravity:** finish its open Overround tasks first (#74, zfiei7, vo3u0y, annety). Not on this mission until those are done.
- **Cursor:** fwcg1q (a11y pass), then the Phase 2 UI.
- **Perplexity:** Phase 3 terms research, tile-provider terms, and the Wikidata P1831 coverage check.
- **Claude Code:** Phases 0 and 1, plus review of all PRs.
