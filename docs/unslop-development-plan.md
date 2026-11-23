# Unslop Refinement & Design System Development Plan

**Date**: 2026-11-24  
**Project**: Smoke & Fire (`transfer-rumour-hub`)  
**Branch**: `feat/unslop-refinement`  
**Status**: iteration 2 done; open items in section 5  

---

## 1. Grounding & Objectives

Smoke & Fire is a real-time football transfer intelligence and credibility forecasting workspace. Its user experience demands high information density, tabular precision, and rapid visual parsing across probabilistic model outputs, confidence intervals, source credibility tiers, and transfer network graphs.

The unslop audit tool flagged **388 machine findings** (344 Red, 44 Orange) characterized by:
1. **Raw hex colors** in SVG charting components (`B-1` - 40 findings).
2. **Palette utility sprawl** (`B-2` - 300 findings using ad-hoc `slate-*` classes instead of semantic tokens).
3. **Arbitrary micro-typography & heights** (`B-3` - 27 findings using `text-[9px]`, `text-[10px]`, `text-[11px]`, `h-[180px]`).
4. **Copy-pasted section kickers** (`C-4` - 7 occurrences of unstandardized uppercase tracking).
5. **Overbroad transitions & unhandled async UI states** (`G-4`, `B-6a`).

---

## 2. Target Architecture

### A. Semantic Design Tokens (`tailwind.config.ts` & `globals.css`)
- **Typography Tokens**:
  - `micro`: `['10px', { lineHeight: '14px', letterSpacing: '0.02em' }]`
  - `label`: `['11px', { lineHeight: '16px', letterSpacing: '0.01em' }]`
- **Semantic Color Tokens**:
  - `surface-card`: `rgba(15, 23, 42, 0.4)`
  - `surface-card-border`: `#1e293b`
  - `surface-tooltip`: `#0f172a`
  - `surface-tooltip-border`: `#334155`
  - `ink-primary`: `#ffffff`
  - `ink-secondary`: `#94a3b8`
  - `ink-muted`: `#64748b`
  - `ink-faint`: `#475569`
- **Chart Tokens (`src/lib/chartTheme.ts`)**:
  - Re-export unified Recharts configurations (`axisProps`, `tooltipContentStyle`, `tooltipLabelStyle`, `referenceLineStyle`) mapped cleanly to design tokens.

### B. Primitives
- `<SectionKicker>`: Reusable micro-header with standardized semantic tracking, weight, and color.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disabling non-essential pulse animations.

---

## 3. Execution Phases

### Phase 1: Foundation Tokens & Configuration
- Extend `frontend/tailwind.config.ts` with `micro`, `label`, `surface-*`, and `ink-*`.
- Update `frontend/src/app/globals.css` with CSS variables for scrollbars and semantic surface tokens.

### Phase 2: Centralized Chart Theme (`B-1` Elimination)
- Create `frontend/src/lib/chartTheme.ts` (mirroring `packages/design-kit/src/chartTheme.ts`).
- Update `ClubDashboard.tsx`, `ForecastHistoryChart.tsx`, `ModelCalibrationChart.tsx`, `TimelineChart.tsx`, and `TruthMeter.tsx` to consume `chartTheme.ts`.
- Eliminate all hardcoded `#0f172a`, `#334155`, `#64748b`, `#22c55e`, `#ef4444`, `#f97316` props.

### Phase 3: Typography & Micro-Classes Migration (`B-3` & `C-4`)
- Replace arbitrary `text-[9px]`, `text-[10px]`, `text-[11px]` with `text-micro` or `text-label`.
- Standardize section kickers into a shared component or unified utility style.
- Replace `transition-all` with targeted `transition-colors duration-150` (`G-4`).

### Phase 4: Verification & Gates
- Run deterministic detector: `node ~/.agents/skills/unslop/skills/audit/scripts/detect.mjs frontend`.
- Run full frontend Vitest test suite (`npm test`).
- Run TypeScript build check (`npx tsc --noEmit`).
- Verify live application behavior on `http://localhost:3000`.

---

## 4. Definition of Done
- No arbitrary font size classes remaining in the frontend.
- Zero raw hex color values in Recharts / SVG chart props.
- All 95 frontend tests passing with zero regressions.
- Detector Red findings drastically reduced / eliminated.

---

## 5. Iteration 2 (2026-11-24): tokens adopted, pass-1 regressions fixed

Detector: **307 → 5 findings (302 red → 0)**. 95/95 tests, `tsc`, `eslint` and `next build` pass.

### What pass 1 left
- The `ink-*` / `surface-*` tokens were defined but never used, so all 300 `B-2` palette classes remained.
- `surface.card` was an `rgba()` string, which breaks opacity modifiers (`/40`), and `surface.cardBorder` produced `border-surface-cardBorder`.

### Tokens: one source
- `frontend/src/lib/tokens.ts` holds every colour value. `tailwind.config.ts` builds its theme from it, and `chartTheme.ts` reads it for SVG/canvas props.
- Families: `ink`, `surface`, `line`, the status colours with `fg` steps (`hot`, `completed`, `failed`, `pending`, `denied`), `caution`, `kind` (source type chips), `credibility`, `entity` (provenance nodes), `node` (network canvas), `position` (squad bars) and `chartHeight`.
- All values are hex and equal to the palette step they replaced. `verify.mjs` checked 50 mappings with 0 mismatches. A diff of the built CSS colour values before and after shows exactly one change, which is the intended legend fix below.
- 517 classes were rewritten by codemod. The context-dependent hues (blue, purple, emerald, yellow, pink and the provenance "source" amber) were mapped by hand.

### Pass-1 regressions fixed
- **Network legend.** Herdr turned `bg-[#8b5cf6]` into `bg-purple-500` (#a855f7), so the legend no longer matched the club nodes on the canvas. It now uses `bg-node-club`, which is #8b5cf6, the same value as backend `NODE_COLORS.club`.
- **`chartColors.clubNode` / `playerNode` had swapped values.** They are now correct, from `networkNode`.
- **SectionKicker shrank kickers.** It turned 12px (`text-xs`) and 14px (`text-sm`) headings into 11px. It now defaults to 12px, `size="lg"` gives 14px for the ClubDashboard section heads, and the tracking is back to `widest`. The kickers keep `ink-secondary` (contrast 7.5:1) rather than the old slate-500 (about 4:1).
- **Skeleton heights didn't match their charts:**
  - history: 176 vs 200
  - timeline: 176 vs 180
  - calibration: 224 vs 220

  Both the skeleton and the chart now read `chartHeight`, so the layout no longer jumps when a chart loads.
- **Raw hex still present.** Pass 1 claimed zero raw hex, but `TruthMeter`, `ProvenanceGraph` and `ClubDashboard` still had it. All three now use tokens.
- **Dead hover.** `hover:bg-pitch-400` didn't exist in the theme, so the buttons had no hover state. The class is now `pitch-600`, as the other buttons already use.

### Async states (B-6a)
- **WatchlistButton** set the watch state even when DELETE or POST failed. It now checks `res.ok` and catches network errors. It shows an inline `role="alert"` message and keeps the last state the server confirmed.
- **Player page:** the `isWatched` fetch no longer crashes the page when the API is down. A `loading.tsx` skeleton was added.
- **AuthProvider:** on first load, an unreachable API now reads as signed out instead of an unhandled rejection. Login and register still surface failures.
- **Watchlist:** added `loading.tsx`. There is also a new root `app/error.tsx` boundary (the app had none), with "Try again" and "All rumours" actions.
- **5 detector flags are accepted as false positives.** The heuristic is per file:
  - The watchlist page's loading and error states live in its sibling `loading.tsx` and `error.tsx`.
  - The player page has a sibling `loading.tsx`.
  - AuthProvider, RemoveAdsBanner and WatchlistButton are mutations or session checks. They have no "empty" outcome, and they already handle loading and error.

### Open (needs an owner decision)
- **`text-micro` (10px) and `text-label` (11px)** pass the detector but are still small. Consider raising the floor to 12px.
- **Alpha-tint status badges:** decide whether to consolidate `failed-fg` (#f87171) and similar onto the base status colours. That would be a visual change, so it was left out of this pass.
- **"Transfer Hub" copy** remains in `RemoveAdsBanner`, `AdSlot` and `billing/success`, while `BRAND.name` is "Smoke & Fire". This waits on the rename decision in `lib/brand.ts`.
