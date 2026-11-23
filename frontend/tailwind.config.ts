import type { Config } from 'tailwindcss'
import {
  caution,
  chartHeight,
  credibility,
  entity,
  ink,
  line,
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
      },
      fontSize: {
        micro: ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        label: ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
      },
      height: {
        'canvas-lg': '40rem',
        'canvas-md': '37.5rem',
        ...Object.fromEntries(Object.entries(chartHeight).map(([k, px]) => [`chart-${k}`, `${px}px`])),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
