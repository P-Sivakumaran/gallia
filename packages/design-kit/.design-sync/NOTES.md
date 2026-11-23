## Repo-specific notes

- Build command: `npm run build` (tsup for JS/`.d.ts` + `tailwindcss` CLI for `dist/styles.css`, chained in one script).
- Package shape (no Storybook) — previews are hand-authored in `.design-sync/previews/`, one `.tsx` per component, all 15 authored (none on the floor card).
- **Tailwind content glob must include preview files.** `tailwind.config.js`'s `content` array has both `./src/**/*.{ts,tsx}` AND `./.design-sync/previews/**/*.tsx`. First capture pass shipped with only `src/` scanned — every preview's `bg-slate-950` canvas class silently failed to compile (0 bytes emitted), so every card rendered on a white background instead of the intended dark one. If a future preview uses a new utility class not already present in `src/`, rebuild and grep `dist/styles.css` for it before trusting the render check — the render check only catches empty/thin renders, not "wrong color due to missing CSS."
- Fonts (`Inter`, `JetBrains Mono`) don't ship with the DS's own dependencies — they're Google Fonts, loaded in the real app via `next/font/google` (Inter only; JetBrains Mono isn't actually loaded anywhere in the real app either, despite being named in its Tailwind config). Sourced real latin-subset woff2 files from Google Fonts' CDN directly (`fonts.gstatic.com`, license: Inter SIL OFL, JetBrains Mono Apache 2.0) and shipped them via `cfg.extraFonts` rather than accepting a system-font substitute.
- `font-sans`/`font-mono` Tailwind utility classes are NOT in the compiled CSS (nothing in `src/` or the previews applies them as a class) — see conventions.md's "Known limitation". If a future component/preview starts using them, they'll start compiling in and this note can be deleted.

## Known render warns

None — clean render check (`bad: 0`, `thin: 0`, `variantsIdentical: 0`) as of this sync.

## Re-sync risks

- The dark-canvas requirement (`bg-slate-950`) is asserted in `conventions.md` but not enforced by any lint/type — a future component added without a dark-canvas-aware preview will look washed-out in its card, and the render check won't catch it (it only catches blank/thin, not wrong-background).
- `tokens.ts` is a **manual mirror** of `frontend/tailwind.config.ts` — there's no build-time link. If the real app's `pitch`/status colors change, this package's `tokens.ts` AND `tailwind.config.js` both need a matching manual update, or the design-kit silently drifts from the real app's look.
- The two font files are vendored copies fetched once from Google's CDN — not tracked to a specific Google Fonts release/version. If Inter or JetBrains Mono ship a redesigned glyph set upstream, these won't auto-update.
- This package is not yet consumed by the real frontend (`frontend/src/components/*` still has the original, non-generic versions) — the two can drift. Nothing currently keeps them in sync; that was out of scope for this pass (extraction only, not a refactor of the app to consume it).
