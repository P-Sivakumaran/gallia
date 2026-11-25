# Gallia development plan

Written 2026-11-25. Draft for the owner's approval. This replaces `docs/roadmap.md` as the
live plan (the roadmap predates the 2026-11-24 decision that Gallia is a public website,
not a SaaS product). Product rules live in `docs/gallia-product-direction.md`; this plan
does not restate them, it schedules work under them.

Claims marked **[verified]** were checked in the repo or the local database on 2026-11-25.
Claims marked **[sourced]** come from Perplexity research the same day (links at the end)
and should be re-checked before money is spent.

## 1. Where things stand

| Area | State |
|---|---|
| Public desk | `/` is the Gallia desk, fed by `GET /gallia/workspace` (backend → Supabase → illustrative). Merged in PR #9. [verified] |
| Live estimates | Heuristic engine output, labelled "Model estimate · uncalibrated". [verified, product direction doc] |
| Resolved outcomes | Local DB: 67 rumours, of which 29 COMPLETED, 34 FAILED, 4 PENDING. 2 claims, 8 claim forecasts, 19 sources. [verified] |
| Calibration gate | Calibrated pipeline needs 200 resolved outcomes (`minSampleSizeForPrecise`). Current evidence-model data is far short. [verified] |
| Outcome resolution | Exists: text patterns (`detectOutcome`, "here we go", "deal collapsed"…) plus window-close resolution in the maintenance worker. [verified] |
| Outcome feeds | A Sportmonks key is already configured, on the "Euro Club Tournaments" plan: Champions League, Europa League, Conference League, Super Cup only (`sportmonksCatalog.ts` TARGET_LEAGUES). No domestic leagues. API-Football code exists (`sources/apifootball.ts`) but no key is set. [verified] |
| CI / deploy | No `.github/workflows`, no Dockerfile, no host config. [verified] |
| Tests | frontend 95, backend 149 (4 integration files need Postgres/Redis), ml-service 18 (as of 2026-11-23). |

### Integrity risk found while planning

`resolveWindowOutcomes` (`backend/src/ingestion/outcomeDetector.ts`) marks a rumour COMPLETED
when `player.currentClubId === toClubId` after the window's grace period, and **FAILED
otherwise**. If the player-club sync is stale or never matched the player, a transfer that
happened is scored as a miss. Because the Sportmonks plan only covers UEFA club
competitions, a player moving to a club outside that set (most domestic-only clubs) never
gets `currentClubId` updated, so the move is automatically marked FAILED. The 34 FAILED rows
may include some of these. Absence from a feed is not evidence of failure. [verified code;
principle sourced]

## 2. What the old roadmap carried that is now retired

| Old item (roadmap.md) | Now |
|---|---|
| M3 Stripe checkout for Supporter/Pro | Retired. No payments on a public website. |
| M3 Alerts via entitlements, email/push | Retired as a product feature. The desk's reading list stays page-session only. |
| M1 "Pricing" in the nav | Already unlinked (4f52a55). Route kept until the retirement task below. |
| M0 unchecked boxes (fresh clone, `~/.git` retired, repo rename) | Done 2026-11-23/24. Only the `autoMode` trust scope remains, and only the owner can change it. |
| M2 Real outcomes, scorecard history, source leaderboard | Kept. Becomes Phases 1–3 below. |
| M3 Deploy, `/clubs` index, PoLP Phase 4 | Kept. Phases 5–6. |

## 3. Phases

Ordered by what the public scorecard claim depends on. Each phase is one or more PRs on
its own feature branch; nothing goes straight to `main`.

### Phase 0: Hygiene (small, start now)

- Add GitHub Actions CI: frontend + backend unit tests, typecheck, lint, ml-service pytest.
  Integration tests run in a job with Postgres and Redis service containers.
- `Projects/transfer-rumour-hub/frontend` sits at the repo root, gitignored (left over from
  Make's old layout). Inventory it for any UI work not on `main`, archive it, then remove it.
  Do not delete before the inventory.
- Owner-only blockers: Supabase anon role has no GRANTs (desk fallback gets 401);
  `~/.claude/settings.json` `autoMode` still names `transfer-rumour-hub`.

### Phase 1: Outcome integrity (the core of the scorecard)

The scorecard is only as honest as its resolutions. Fix how outcomes are decided before
collecting more of them.

1. **Resolution rules, written down first** (`docs/resolution-rules.md`): what counts as
   completed (official signing, not "terms agreed" or "here we go"); loans vs permanent vs
   loan-with-option scored separately; the forecast deadline per window; what is void.
2. **Evidence on every resolution**: store the source (feed record, club announcement URL,
   admin), when the transfer happened, and when Gallia first saw the confirmation. Additive
   schema change, existing rows kept.
3. **No silent FAILED**: window-close resolution only marks FAILED when the player-club sync
   is fresh, the player is matched, and both clubs are inside the feed's league coverage.
   Otherwise the rumour goes to an owner review queue (`/admin`, already behind
   `requireAdmin`).
4. **Text patterns become signals, not verdicts**: "here we go" or "deal off" raise a
   candidate resolution for review instead of setting status directly.
5. **Audit the 63 existing resolved rumours** against the feed and fix wrong ones in place
   with an audit event. No wipe and reseed.
6. **Outcome feed coverage** (owner decision D2): keep Sportmonks as the source of truth, but
   the current plan's UEFA-only coverage is too narrow to resolve most transfers. Either add
   the domestic leagues Gallia covers to the Sportmonks plan, or keep coverage as is and
   route out-of-coverage rumours to manual review. Club announcements are linked as evidence, summarised in Gallia's own words, never
   copied. Transfermarkt is excluded: its terms forbid automated access. [sourced]

### Phase 2: Public scorecard v2

Small-sample honesty, following what Metaculus and Good Judgment Open publish. [sourced]

- One score per resolved question, using its **last pre-outcome estimate** (already the
  ledger rule), never forecast updates counted as separate tests.
- Brier score (0–1 convention) next to a **base-rate baseline** on the same questions, with a
  bootstrap interval resampled by player (one player's rumours are not independent).
- Reliability diagram with 3–5 fixed bins, `hits / n` on every point, pointwise Wilson
  intervals, empty bins left empty, no smoothed curve.
- Per-window history (Brier per transfer window) once a window has resolved questions.
- A methodology page stating the deadline rule, eligibility, voids, and "early track record,
  not a measure of skill" while under 200.
- Heuristic and calibrated estimates scored separately and labelled as such.

### Phase 3: Source leaderboard

- Per outlet/journalist: `hits / adjudicated claims`, Wilson 95% interval, pending count,
  date range. Dot-and-whisker chart, not a ranked table.
- Optional, separately labelled beta-binomial shrunk estimate; raw counts always visible.
- Minimum-n threshold before a source shows a rate at all; below it, show the ledger only.
- Each claim records: exact quote, timestamp, own reporting vs relaying someone else, the
  testable proposition, deadline, and resolution evidence.

### Phase 4: Volume for the January 2027 window

The January window opens in about five weeks and is the next chance to collect real
outcomes. Gate: Phases 1 and 2 merged before 2027-01-01.

- Widen ingestion coverage (19 sources today) for the leagues the Sportmonks plan covers.
- Watch ingestion health daily through January (operational events already exist).
- Retrain on `trainingDataSource: 'db'` only after 200 resolved outcomes pass. Not before.

### Phase 5: Launch

- Hosting (owner decision D1). Researched options, low traffic, monthly [sourced]:
  - Hetzner VPS + Docker Compose: about €10–20. Cheapest. You run backups and updates.
    No Australian region (Singapore nearest).
  - Render all-in-one: about US$60–80 realistic. Least operational work.
  - Vercel Pro + Railway: about US$40–65. Best Next.js workflow, two bills.
- Whatever the host: Redis with AOF persistence and `maxmemory-policy noeviction` (BullMQ
  requirement), off-host Postgres backups with a tested restore, idempotent jobs.
- Retire the imported SaaS routes (register, pricing, billing, entitlement upsells) as their
  own scoped PR. Keep owner login and admin access working throughout.
- Security pass before going public: admin routes, rate limits, secrets, CORS. Strix scan.

### Phase 6: Later

- `/clubs` index and per-club scorecards.
- PoLP Phase 4: split BullMQ workers from the API with their own DB role.

## 4. Who does what

| Agent | Lane |
|---|---|
| Claude Code | Phase 1 backend and schema, CI, review of every PR, merges once green. |
| Figma Make | Scorecard v2 and leaderboard UI, on feature branches only, never `main`. |
| Brand (quant) | Reviews Phase 2/3 statistics: intervals, baseline, bin choice. Numbers with sample sizes. |
| Antigravity | Busy with Overround Phase 1a/1b. Offered Phase 0 CI or Phase 5 deploy scaffolding after the owner approves. |
| Cursor | Available for frontend work in the owner's sessions. |
| Owner | Decisions D1–D4, Supabase GRANTs, `autoMode` scope, Sportmonks plan change. |

No agent changes auth, roles or billing code without the owner's explicit OK.

## 5. Owner decisions

Decided 2026-11-25 (owner, in chat: "approve, render, add sportmonks leagues, retire saas
routes"):

- **D1 Hosting: Render.** Plan for about US$60–80/month; size the ml-service before launch.
- **D2 revised 2026-11-25: TheStatsAPI, not Sportmonks.** The owner is not using Sportmonks.
  The player-sync job uses TheStatsAPI (`STATS_API_KEY`, the key Overround already holds) to
  set each open-rumour player's current club. It covers about 150 competitions but has no
  transfer history, so it confirms where a player is now, never when he moved. Club mismatches
  still go to owner review. The key's 12 requests/minute are shared with Overround, so the sync
  spaces calls 6 s apart and stops on a 429. Open question: do its terms allow public display?
  The original D2 text follows for the record.
- **D2 (superseded) Outcome feed: add domestic leagues to the existing Sportmonks plan.** Owner makes the
  change on the Sportmonks account. `TARGET_LEAGUES` becomes configurable so new league IDs
  need no code change; verify with a read-only `GET /leagues` afterwards. Which leagues to add
  should follow where Gallia's rumoured clubs actually play, not an assumed top 5. The €29/€99
  prices are from research; the current "Euro Club Tournaments" plan may upgrade differently.
- **D3 SaaS routes: retire.** Owner login and the first-admin bootstrap must keep working:
  public registration is switched off by a flag rather than deleted, and the retired pages
  are archived on a branch before removal.
- **D4 Plan: approved.** CHAP attestation is pending: the CHAP server was not loaded in the
  approving session. Record it from a session started inside the repo before the first
  schema migration.

Original options, kept for the record:

- **D1 Hosting:** Hetzner / Render / Vercel + Railway.
- **D2 Outcome feed coverage:** you already pay for Sportmonks, but only for UEFA club
  competitions. Options: add domestic leagues to the Sportmonks plan (Sportmonks' 2026
  pricing is per league count: Starter about €29/month for 5 selected leagues, Growth about
  €99 for 30; check how your current plan upgrades), or keep UEFA-only and resolve
  everything else by manual review. API-Football (about US$19/month) is cheaper, but its
  terms say it grants no publication licence, so it isn't recommended. Recommendation: add
  the top 5 domestic leagues to Sportmonks, and ask them in writing about public display
  and keeping resolution records after cancelling. [sourced]
- **D3 SaaS routes:** retire register/pricing/billing before launch, or keep hidden.
- **D4 Phase 1 start:** approve this plan so Phase 0 and Phase 1 can begin.

## 6. Rules every phase keeps

- Live estimates stay labelled "Model estimate · uncalibrated" until the 200-outcome gate.
- Real records never inherit illustrative forecasts or calibration figures.
- Ledger scores each story on its last pre-outcome estimate.
- No betting framing.
- No database wipes; fix bad rows in place.
- Never run `next build` in `frontend/` while `next dev` runs.
- CHAP attestation when this plan is approved and before each schema migration.

## Sources

- Sportmonks pricing and terms: https://www.sportmonks.com/blogs/introducing-our-new-pricing-setup/ ,
  https://www.sportmonks.com/terms-of-service/ , https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/transfers
- API-Football terms and pricing: https://www.api-football.com/terms , https://www.api-football.com/pricing
- Transfermarkt terms: https://www.transfermarkt.com/intern/anb
- Hosting: https://render.com/pricing , https://railway.com/pricing , https://vercel.com/pricing ,
  https://www.hetzner.com/cloud/ , https://docs.bullmq.io/guide/going-to-production
- Calibration practice: https://www.metaculus.com/questions/track-record/ , https://www.gjopen.com/faq ,
  https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm ,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8484151/
