# Roadmap — Smoke & Fire

Written 2026-11-23. The backend is further along than the product around it: auth, roles,
entitlements, Research API keys, retention, a calibrated forecasting pipeline and least-privilege
DB roles all exist. What's missing is identity, a public face for the forecasting work, and
real-outcome data. This plan turns the repo into a product without rewriting what works.

## Positioning

Rumour trackers grade sources but never show whether their grades were right. Smoke & Fire's
claim is the opposite: forecasts with a public scorecard, misses included, and denials never
paywalled. Everything below serves that claim.

## Milestone 0 — Repo hygiene (needs owner decision)

The git repository root is the owner's home directory, and GitHub stores the app under
`Projects/transfer-rumour-hub/`. That nests every path, makes `git add -A` in `~` dangerous on a
public repo, and blocks normal clones, CI paths and deployment.

1. Merge a commit that moves `Projects/transfer-rumour-hub/*` to the repo root (`git mv`, history kept).
2. Clone fresh to `~/Projects/<name>`; copy `.env` files across; check `.gitignore` covers them.
3. Bring the untracked `packages/design-kit` (135 MB on disk, mostly build output) in deliberately:
   commit `src/`, config and `.design-sync/` notes, gitignore `dist/`, `ds-bundle/_*` and caches.
4. Retire `~/.git` after confirming nothing else in `~` is tracked (230 files, all under the app path).
5. Update the Claude Code `autoMode` trust scope to the new path.
6. Optionally rename the GitHub repo to the chosen name (GitHub redirects old URLs).

## Milestone 1 — Identity and the scorecard (this PR)

- [x] Product name in one constant (`frontend/src/lib/brand.ts`), used in title and nav.
- [x] Public `/scorecard` page: Brier score, calibration chart, honest labelling of synthetic or
      under-sampled models. Reuses the existing `ModelCalibrationChart` and `GET /forecast/model-health`,
      which had no page.
- [x] Nav: removed the dead `/clubs` link, added Scorecard and Pricing, fixed mobile overflow.
- [x] Monospace font fallback (numbers rendered in a serif font in Chromium).
- [ ] Landing page hero stating the positioning above the live feed.
- [ ] Visual assets (Raea prompt drafted separately): vertical "rumour of the day" clip, hero loop, OG image.

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
