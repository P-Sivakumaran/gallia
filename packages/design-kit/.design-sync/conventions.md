## Setup

No provider/context wrapper needed — every component is a plain function component with no React context dependency.

**One hard requirement: always render on a dark canvas**, `bg-slate-950` or darker. Every card-like component (`Card`, `PaywallPrompt`, `Badge`, `Chip`) uses translucent fills (e.g. `bg-slate-900/40`, `bg-slate-800/40`) and slate-scale text (`text-slate-400`, `text-slate-500`) tuned against a near-black background. On a light or white background these render as washed-out gray boxes with low-contrast text — this is not a bug to fix with different classes, it's the one setup step: wrap your composition root in a dark background before placing these components.

## Styling idiom

Tailwind utility classes, real names from this package's `tailwind.config.js` / `tokens.ts`:

- **Brand green** — `pitch-{50,100,500,600,900}` (e.g. `bg-pitch-500`, `text-pitch-500`, `border-pitch-500`). `pitch-500` (`#22c55e`) is the primary action/success color (CTAs, active filter state, positive indicators).
- **Status colors** — `hot` (`#f97316`), `completed` (`#22c55e`), `failed` (`#ef4444`), `pending` (`#94a3b8`) — used as `text-{name}`/`bg-{name}` for state indication. `Badge`'s `tone` prop maps onto a parallel but distinct set (`good`/`warning`/`serious`/`critical`/`neutral`) — don't conflate the two vocabularies.
- **Ink** — `text-white` (primary), `text-slate-400` (secondary), `text-slate-500` (muted), `text-slate-600` (faintest, footnotes).
- **Surfaces** — `bg-slate-900/40` (card fill), `border-slate-800` (card border), `bg-slate-950` (page/canvas background — see Setup above).
- **Radii** — `rounded-xl` (cards), `rounded-full` (badges, chips, pill buttons). No other radius scale is used.
- **Charts** (if composing with recharts) — import `axisProps`, `tooltipContentStyle`, `tooltipLabelStyle`, `referenceLineStyle` from this package rather than restating axis/tooltip styling inline.

## Where the truth lives

- `dist/styles.css` — the real compiled stylesheet (this is what's bound into the DS bundle).
- `tokens.ts` — the same colors as plain JS values (`colors.pitch.500`, `colors.status.hot`, etc.) for anything that needs a real color value rather than a className — e.g. `RadialGauge`'s `color` prop, or recharts `stroke`/`fill` props.
- Per-component `.prompt.md` for props and usage.

## Build snippet

```tsx
import { Card, Badge, RadialGauge, colors } from '@transfer-hub/design-kit'

function RumourSummary() {
  return (
    <div className="bg-slate-950 p-6"> {/* dark canvas — see Setup */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Saka → Real Madrid</p>
          <Badge label="HOT" tone="serious" />
        </div>
        <RadialGauge value={78} label="HOT" color={colors.status.hot} size="sm" />
      </Card>
    </div>
  )
}
```

## Known limitation

`font-sans`/`font-mono` Tailwind utility classes are **not** in the compiled CSS — Tailwind only emits utilities actually referenced somewhere in this package's source, and no component sets a font-family class itself (they only set color/size/weight). `Inter` and `JetBrains Mono` **do** ship as real `@font-face` declarations, but nothing triggers them without help: either add `font-family: Inter, sans-serif` at your composition root yourself, or don't rely on this kit for font selection.
