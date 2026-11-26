# PR #46 before/after screenshots

Captured with Playwright Chromium against:
- **before:** `~/Projects/gallia` on `:3000` (origin/main)
- **after:** this branch on `:3010`

Routes: `/`, `/rumours`, `/network`, `/scorecard`, `/player/1`  
Sizes: desktop 1440×900, phone 390×844

Pixel noise on dynamic routes (rumour ticker, player data) is expected; chrome/layout should match. Spacing is preserved via `--space-*` tokens (no snap). `#f8fafc` is expressed as equivalent `oklch(0.9846 0.0017 247.8)` for Hallmark gate 74.
