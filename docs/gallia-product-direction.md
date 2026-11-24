# Gallia product direction

Gallia is a public football transfer intelligence website, published and managed
by its owner. It is not a multi-tenant SaaS product.

## Public experience

- Readers browse transfer stories, claim dossiers, evidence provenance, and the
  public forecast/calibration record without needing an account.
- Keep the original green Gallia logo and the refined, terminal-inspired visual
  language. Data density is an editorial choice, not a software-product pitch.
- Avoid customer-workspace terminology, onboarding funnels, team management,
  software subscriptions, plan upsells, and account-oriented alerts.
- The new desk's reading list is optional and temporary: React state for the
  current page visit only, cleared on reload or close. It does not create a
  reader account, save a profile, or promise notification delivery.
- A public watchdesk highlights loaded stories. It is distinct from a reader's
  saved stories; do not describe automated selection as a manual editorial pick.

## Owner operations

Content curation, corrections, source review, and publishing belong to the owner's
administration workflow, not a customer-facing product dashboard. Reuse the
existing authenticated backend and inspect its access rules before extending it.
Do not mistake hiding a public sign-in link for securing an admin route.

The current UI changes do not alter authentication, roles, registration,
entitlements, billing, or existing legacy routes. Those imported SaaS-oriented
surfaces are not linked from the new public desk. Review and retire unused
registration/pricing/billing flows as a separately scoped launch task; preserve
the owner's access and data throughout.

## Data integrity

Illustrative editions must remain explicitly labeled. Real records must not
inherit sample forecasts or calibration figures. Existing real-outcome/model
gates and Supabase permissions remain in place. Authorized live data, ingestion,
and deployment are separate integration work, not implied by this positioning
change.

### Live desk (owner decision, 2026-11-24)

The owner chose to run the desk on live data, model estimates included ("theorised
or not"). `GET /gallia/workspace` on the Express backend (backend/src/gallia/)
serves stories, evidence, metrics and the resolved-call ledger; the frontend reads
it first, then Supabase, then the illustrative edition. Rules that still hold:

- Likelihoods on live records are the heuristic scoring engine's output and are
  labelled "Model estimate · uncalibrated" everywhere (`forecastBasis: 'heuristic'`).
  The calibrated pipeline's 200-outcome gate is unchanged.
- The ledger scores each resolved story on its last pre-outcome estimate, never on
  history written after the outcome.
- Source tiers are derived from reliability at read time unless an editor set one.
- Facts the data doesn't hold (representation, wages) stay "Not disclosed".
