/**
 * Design tokens: the one place a colour value lives.
 *
 * tailwind.config.ts builds its theme from this file and chartTheme.ts reads it for
 * SVG/canvas props, so a utility class and a chart stroke can never drift apart.
 * Values are hex (not rgba) so Tailwind opacity modifiers like `bg-surface-panel/40` work.
 *
 * Each value matches the palette step it replaced, so adopting the tokens changed no pixels.
 * Where two steps of one hue were in use, `fg` is the lighter step used for text on dark.
 */

/** Brand green (exact app tokens). */
export const pitch = {
  50: '#f0fdf4',
  100: '#dcfce7',
  500: '#22c55e',
  600: '#16a34a',
  900: '#052e16',
} as const

/** Text on the dark UI, strongest to faintest. */
export const ink = {
  primary: '#ffffff',
  strong: '#f1f5f9',
  body: '#e2e8f0',
  soft: '#cbd5e1',
  secondary: '#94a3b8',
  muted: '#64748b',
  faint: '#475569',
} as const

/** Background layers, back to front. */
export const surface = {
  base: '#020617',
  panel: '#0f172a',
  raised: '#1e293b',
  overlay: '#334155',
  subtle: '#475569',
} as const

/** Borders and dividers. */
export const line = {
  subtle: '#1e293b',
  DEFAULT: '#334155',
  strong: '#475569',
  emphasis: '#64748b',
} as const

/** Rumour status. DEFAULT is the app's status colour; `fg` is its text step on dark. */
export const status = {
  hot: { DEFAULT: '#f97316', fg: '#fb923c' },
  completed: { DEFAULT: '#22c55e', fg: '#4ade80' },
  failed: { DEFAULT: '#ef4444', fg: '#f87171', soft: '#fca5a5', deep: '#7f1d1d', deepest: '#450a0a' },
  pending: { DEFAULT: '#94a3b8' },
  denied: { DEFAULT: '#6b7280', fg: '#9ca3af', line: '#4b5563', deep: '#374151' },
} as const

/** Caveats: synthetic data, original-source markers, warnings. */
export const caution = { DEFAULT: '#f59e0b', fg: '#fbbf24', soft: '#fcd34d' } as const

/** Source type chips (RumourCard). */
export const sourceKind = {
  journalist: { DEFAULT: '#3b82f6', fg: '#93c5fd' },
  outlet: { DEFAULT: '#a855f7', fg: '#d8b4fe' },
  official: { DEFAULT: '#10b981', fg: '#6ee7b7' },
  agent: { DEFAULT: '#eab308', fg: '#fde047' },
  social: { DEFAULT: '#ec4899', fg: '#f9a8d4' },
  aggregator: { DEFAULT: '#64748b', fg: '#cbd5e1' },
} as const

/** Credibility dots (filled step). */
export const credibility = '#34d399'

/** Entities in the provenance graph (DOM nodes). */
export const entity = {
  player: '#3b82f6',
  club: '#a855f7',
  source: '#f59e0b',
} as const

/** Node colours in the transfer network canvas. Must match backend/src/routes/graph.ts NODE_COLORS. */
export const networkNode = {
  player: '#60a5fa',
  club: '#8b5cf6',
} as const

/** Squad-position bars (ClubDashboard): one hue per line of the pitch, lighter for wider roles. */
export const position: Record<string, string> = {
  GK: '#6366f1', CB: '#8b5cf6', LB: '#a78bfa', RB: '#c4b5fd',
  CDM: '#3b82f6', CM: '#60a5fa', CAM: '#93c5fd',
  LM: '#22d3ee', RM: '#67e8f9',
  LW: '#22c55e', RW: '#4ade80',
  ST: '#f97316', CF: '#fb923c',
}

/** Pixel heights of each chart, shared by the chart and its loading skeleton so nothing jumps. */
export const chartHeight = {
  club: 140,
  timeline: 180,
  history: 200,
  calibration: 220,
  /** Fits radialLayout's default radius (200) plus node height at 100% zoom */
  provenance: 460,
} as const
