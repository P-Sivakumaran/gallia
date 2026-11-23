# Unslop Refinement & Design System Development Plan

**Date**: 2026-11-24  
**Project**: Smoke & Fire (`transfer-rumour-hub`)  
**Branch**: `feat/unslop-refinement`  
**Status**: in-progress  

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
