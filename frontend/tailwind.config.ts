import type { Config } from 'tailwindcss'
import {
  card,
  caution,
  chartHeight,
  credibility,
  entity,
  field,
  ink,
  line,
  meter,
  networkNode,
  pitch,
  sourceKind,
  status,
  surface,
} from './src/lib/tokens'


// Colours come only from src/lib/tokens.ts. Use the semantic utilities
// (text-ink-muted, bg-surface-panel/40, border-line-subtle, text-failed-fg…), not palette steps.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch,
        ...status,
        ink,
        surface,
        line,
        caution,
        kind: sourceKind,
        credibility,
        entity,
        node: networkNode,
        meter,
        field,
      },
      backgroundImage: {
        // raea PitchBackground: lit centre, deep edges; then a 90px data grid and faint grass stripes.
        field: `radial-gradient(ellipse 85% 65% at 50% 30%, ${field.glow} 0%, ${field.base} 54%, ${field.deep} 100%)`,
        'field-grid':
          'linear-gradient(to right, rgb(34 197 94 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(34 197 94 / 0.05) 1px, transparent 1px), repeating-linear-gradient(to bottom, rgb(34 197 94 / 0.022) 0 160px, transparent 160px 320px)',
        card: `linear-gradient(180deg, ${card.top} 0%, ${card.mid} 55%, ${card.bottom} 100%)`,
      },
      boxShadow: {
        card: card.shadow,
      },
      fontSize: {
        // 12px is the floor for any text in the product. Smaller sizes were retired on 2026-11-24.
        label: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
      },
      height: {
        'canvas-lg': '40rem',
        'canvas-md': '37.5rem',
        ...Object.fromEntries(Object.entries(chartHeight).map(([k, px]) => [`chart-${k}`, `${px}px`])),
      },
      fontFamily: {
        // next/font registers hashed family names; the CSS variables point at them.
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        display: '-0.035em',
        kicker: '0.14em',
      },
    },
  },
  plugins: [],
}

export default config
