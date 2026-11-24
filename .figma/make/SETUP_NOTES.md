# Gallia setup and remaining integration work

## Preview

- Application: `Projects/transfer-rumour-hub`, npm workspaces, Next.js 15 frontend and Express/Prisma backend.
- `install` executes the imported lockfile with `npm ci`; it does not seed or migrate the database.
- `dev` runs only the Next.js frontend on the supervisor's `$PORT`.
- The new homepage can render without Express, Redis, or database credentials.
- Existing routes outside the new desk still require the imported Express backend.

## Supabase

The platform-provided connection metadata exists. A read-only check of `claims`,
`evidence_items`, `players`, and `clubs` reached Supabase, but every request returned
HTTP 401, "permission denied for table …". This confirms reachability, not authorized
schema binding. No grants or RLS policies were changed.

The new server-side read adapter uses that existing public role and the imported
Prisma field names. It must be validated against authorized responses before
production use. Queries currently load at most 500 rows per table; pagination is
required for a production-scale dataset. A denied or unavailable connection shows
an explicitly illustrative workspace. An authorized empty database stays empty.
Real records never inherit example probabilities or calibration statistics.

The supplied `srid_…` identifier is not treated as a PostgreSQL password.
No secrets have been embedded in the new application code.

## Publishing

This repository is not a static site and is not the platform-generated Payload
template. It requires Next.js and Express runtimes, PostgreSQL, and (for its
workers) Redis. No `deploy` script or invented static adapter has been generated.
`verify-deploy` currently reports the missing script; deployment preview is
explicitly skipped according to the preview skill's unsupported-runtime rule.

Recommended: host Next.js on a supported Next runtime and Express/workers on a
long-running Node host, retaining Supabase PostgreSQL. Confirm the hosting
approach before writing production publishing scripts. Do not force static export:
it would break the imported dynamic routes, rewrites, auth, and server data access.
No deployment builds or uploads have been run.

## Product boundaries

- The new desk's watchlist and alert preferences are session-only, with explicit
  disclosure. The original `/watchlist` account implementation is preserved.
- The new desk is not subscribed to SSE; the imported backend emits rumour events,
  not verified claim-forecast events. Do not join the two by coincidental numeric IDs.
- No new Crawl4AI ingestion, email, or push delivery has been connected.
- The existing model's real-outcome calibration gates remain unchanged.
- Public calibration records and all sample reporting in the demo are illustrative.
- The repository mentions a CHAP coordinator, but its tools were not available in
  this session; no decision attestation was fabricated.

## Verification in this session

- `figma make verify-bootstrap`: terminal success; homepage HTTP 200.
- `npm run lint --workspace=frontend`: passed.
- `npm run test --workspace=frontend -- src/components/gallia/GalliaDashboard.test.tsx`:
  six tests passed (disclosure, search, combined filters, session watchlist,
  contradictory evidence, and connected-empty state).
- `figma make verify-deploy`: failed because no supported publishing script exists.
- `figma make verify-deploy-preview --skip`: terminal skipped.
- No production build, deployment, browser viewport audit, or AAA certification
  was performed. Inter and JetBrains Mono use the existing Next font mechanism;
  the preview reported Google Fonts download failures and used fallback faces.
- Dependency installation reported seven moderate advisories. No automatic
  dependency upgrades were applied.
