# Football data plan: league tables, squads and players (approved 2026-11-26)

## Goal

SofaScore-level depth on Gallia, from licensed data only:
- league tables;
- squads;
- player profiles, season stats and match stats;
- shotmaps and heatmaps;
- an EA FC-style player card computed by Gallia.

## Source: TheStatsAPI (already in use)

The key's response headers (2026-11-26) show the Starter plan: 100,000 requests/month and 120/min. The old 12/min was the trial rate. All paid plans allow commercial use, and every endpoint is on every plan.

| Data | Endpoint |
|---|---|
| Competitions (~150 by default, up to 1,196 on request), seasons, groups | `/football/competitions…` |
| League tables | `/competitions/{id}/seasons/{sid}/standings`, plus form and xG from `/teams/{id}/stats?season_id=` |
| Squads | `/teams/{id}/players` (name, position, date of birth, height, foot, nationality, shirt number, market value, contract) |
| Player season stats | `/players/{id}/stats?season_id=&competition_id=` (rating, minutes, goals, assists, xG, xA, passing, duels, defending, cards) |
| Match detail | lineups, timeline, team and player stats, shotmap, heatmaps |
| Injuries and suspensions | `/teams/{id}/injuries-suspensions`, `/players/{id}/injuries-suspensions` |

**Not available, and what we use instead:**

| Gap | Substitute |
|---|---|
| Player photos | Wikimedia Commons, with credit, where available |
| Club crests | Not used (trademarks). Badges in club colours from Wikidata |
| Transfers and career history | Gallia's rumour and outcome data, plus Wikidata |
| EA FC ratings | Our own card (below) |

**Never used:**
- SofaScore, FotMob, FBref and Transfermarkt, whose terms forbid scraping;
- EA FC ratings, which are EA's own work.

### Terms we design around

TheStatsAPI terms, "Data usage", 2026-04-01:
- **No bulk republishing.** We don't redistribute or republish the data "as a standalone dataset, feed, or database".
- **No competing API.** TheStatsAPI-derived fields are never served through Gallia's API-key product.
- **No storage beyond need.** We don't "cache or store the data beyond what is reasonably necessary". We keep the current season, plus the previous one at most, and don't backfill history.
- **Credit.** "Data: TheStatsAPI" appears wherever the data is shown.
- **Page-shaped routes.** Public routes are paginated and rate-limited, with no export endpoints.

## Gallia card

- **Attributes**, each 1–99: Finishing, Creation, Passing, Dribbling, Defending, Duels, Discipline, plus an overall. The labels are Gallia's own, not EA's.
- **Scoring:** each attribute is a percentile against players in the same position and league in the current season, from per-90 stats. Players under 450 minutes are marked "limited sample".
- **No stored scores:** the card is computed from stored season stats and never kept as a separate dataset.

## Budget: use the quota fully, never push it

The key is shared with Overround. Monthly split of the 100,000 requests:

| Share | Requests | Rule |
|---|---|---|
| Gallia | 60,000 | Ceiling, not a target |
| Overround | 20,000 | Untouched by Gallia |
| Reserve | 20,000 | Gallia stops when the remaining quota reaches it |

- **A pacer, not a burst.**
  - Each day Gallia may spend (its remaining share) ÷ (days left in the quota period), read live from `x-monthly-quota-remaining` and `x-monthly-quota-reset`.
  - Unspent budget rolls forward, so the month ends near its share instead of hitting the wall early.
- **Rate.**
  - At most 60 requests/min, half the 120/min limit. Overround always has headroom.
  - On a 429: honour `Retry-After`, halve the rate for the rest of the run, and log it.
- **Priority queue.** Spare budget is spent in this order:
  1. live gameweek work;
  2. squads and injuries;
  3. match detail (shotmaps, heatmaps) for the top leagues;
  4. new competitions from the phase 5 list.

  Breadth grows only while the pacer says there's room.
- **Every request is recorded** (kind, competition, quota remaining), so the admin can see spend by league and the plan can be tuned with real numbers.

## Caching: event-driven refresh, frozen gameweek snapshots

Football data changes only around matches, so polling on a timer wastes calls.

1. **Fixture calendar.** Fixtures per tracked season are refreshed daily (one paginated call per competition).
2. **After each match.** About 3 hours after full time, once the provider has finalised its stats:
   - fetch the match's lineups, timeline, team and player stats, shotmap and heatmaps (top leagues first);
   - refresh that competition's standings.

   About 10–15 requests per match.
3. **Gameweek close.** When every match of a matchday has finished and been fetched:
   - refresh player season stats for the players who played (not whole squads);
   - recompute the Gallia cards;
   - write a **gameweek snapshot**: standings, player season stats and cards, marked with the competition, season and matchday.

   Pages read the latest snapshot. Nothing on a page calls TheStatsAPI.
4. **Between gameweeks.**
   - Squads and injuries weekly, and on transfer-window days daily.
   - Nothing else is fetched.
5. **Serving.**
   - Snapshot pages are cached in Next.js and revalidated by a tag when a new snapshot lands, so they're static until the next gameweek.
   - API responses carry `Cache-Control` with stale-while-revalidate.
6. **Retention.** Snapshots are kept for the current season and the previous one only (TheStatsAPI terms). Older ones are deleted, and season history isn't backfilled.

Estimated monthly spend, top 5 leagues plus the Champions League:

| Item | Requests/month |
|---|---|
| Matches (~170 a month) | ~2,500 |
| Gameweek player refresh | ~9,000 |
| Standings and fixtures | ~400 |
| Squads and injuries | ~1,000 |
| **Total** | **~13,000** |

That leaves about 45,000 of Gallia's share for more competitions and deeper match detail. The pacer decides how much.

## Phases

1. **Sync service.** Schema for competitions, seasons, fixtures, standings, player season stats, gameweek snapshots and a request log; `npm run sync:football-data`; pacer, quota guard and tests.
   - **Matching existing players:** by name plus current club, then a unique name with an age tolerance. Ambiguous matches go to admin review as unapplied SourcedFacts. Existing players are never merged automatically.
   - **`currentClubId` is untouched on existing players.** The player-club sync remains its only writer, because it resolves rumours for the scorecard.
   - **Clubs** use the existing `tsa-team-<id>` mapping.
2. **Scheduled jobs and public read routes.** Competitions, standings, squads, player stats, and the card.
3. **Pages, designed with Hallmark.**
   - League table with form, home/away and top scorers and assists.
   - Team page with squad by position.
   - Player page with the card, season table and match log.
   - Compare view.
4. **Match pages:** lineups, timeline, shotmap, heatmaps.
5. **More competitions:** Portugal, the Netherlands, the Championship, Brazil, Saudi Arabia, then women's leagues. Upgrade to Growth ($129) only if the budget needs it.
