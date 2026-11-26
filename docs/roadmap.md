# Roadmap — Gallia

> **Superseded 2026-11-25** by `docs/gallia-dev-plan.md`. Kept as history. Stripe checkout,
> paid tiers and entitlement alerts below are retired: Gallia is a public website.

Written 2026-11-23. The backend is further along than the product around it: auth, roles,
entitlements, Research API keys, retention, a calibrated forecasting pipeline and least-privilege
DB roles all exist. What's missing is identity, a public face for the forecasting work, and
real-outcome data. This plan turns the repo into a product without rewriting what works.

## Positioning

Rumour trackers grade sources but never show whether their grades were right. Gallia's
claim is the opposite: forecasts with a public scorecard, misses included, and denials never
paywalled. Everything below serves that claim.

## Milestone 0 — Repo hygiene (approved 2026-11-23)

The git repository root was the owner's home directory, and GitHub stored the app under
`Projects/transfer-rumour-hub/`. That nested every path, made `git add -A` in `~` dangerous on a
public repo, and blocked normal clones, CI paths and deployment.

- [x] Move `Projects/transfer-rumour-hub/*` to the repo root (`git mv`, history kept).
- [x] Point `.mcp.json` (CHAP server) at the checkout, now `~/Projects/gallia`.
- [x] Commit `packages/design-kit` source (36 files; its own `.gitignore` already excludes build output).
- [x] Push the local-only `ml-scoring-service` branch as `archive/ml-scoring-service`.
- [ ] Fresh clone at `~/Projects/gallia` with `.env` files, `.chap/` audit log, trained
      ml-service models and the design-kit build state copied across.
- [ ] Retire `~/.git` (moved aside to `~/Archive`, not deleted) once this lands on `main`.
- [ ] Update the Claude Code `autoMode` trust scope to the new repo name.
- [x] Rename the GitHub repo to `gallia` (2026-11-26; GitHub redirects the old `smoke-and-fire` and `transfer-rumour-hub` URLs).

## Milestone 1 — Identity and the scorecard (completed)

- [x] Product name in one constant (`frontend/src/lib/brand.ts`), used in title and nav.
- [x] Public `/scorecard` page: Brier score, calibration chart, honest labelling of synthetic or
      under-sampled models. Reuses the existing `ModelCalibrationChart` and `GET /forecast/model-health`,
      which had no page.
- [x] Nav: removed the dead `/clubs` link, added Scorecard and Pricing, fixed mobile overflow.
- [x] Monospace font fallback (numbers rendered in a serif font in Chromium).
- [x] Landing page hero stating the positioning above the live feed with live SSE updates and radar sweep.
- [x] Visual assets: dynamic OpenGraph image card (`/opengraph-image`), brand motion, and two-tone wordmark.

## Milestone 2 — Real outcomes

The scorecard is only as good as resolved claims. The current model is trained on synthetic data.

- Resolve outcomes automatically at window close: completed / collapsed / still open, from
  official club announcements and the existing Sportmonks transfer feed.
- Retrain on `trainingDataSource: 'db'` once resolved claims pass `minSampleSizeForPrecise` (200).
- Scorecard history: Brier score per transfer window, so improvement (or not) is visible.
- Source leaderboard: per-outlet hit rate against resolved claims — the feature competitors claim
  but don't measure. Needs care: publish rates with sample sizes and confidence intervals only.

## Milestone 3 — Launch surface

- Deploy (frontend Vercel; backend + Postgres + Redis on one small host; ml-service alongside).
  Requires Milestone 0 first.
- `/clubs` index page (the nav once promised it) and per-club scorecards.
- Alerts: watchlist instant alerts are built behind entitlements; wire email/push delivery.
- Stripe checkout for Supporter/Pro (code paths exist, payment processing deliberately off).
- Phase 4 of the PoLP plan: split BullMQ workers from the API process with their own DB role.

## Out of scope / decided

- Not folded into Overround (different product, stack and security model). A later read-only
  feed of confirmed transfers into Overround's enrichment is possible.
- No betting framing. Probabilities describe transfers, not odds to bet on.
