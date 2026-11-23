/**
 * Single-sourced from transfer-rumour-hub/frontend/tailwind.config.ts.
 * If that file's `pitch`/status colors ever change, update here too —
 * there is no build-time link between the two, this is a manual mirror.
 */

export const colors = {
  pitch: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    900: '#052e16',
  },
  status: {
    hot: '#f97316',
    completed: '#22c55e',
    failed: '#ef4444',
    pending: '#94a3b8',
    denied: '#6b7280',
  },
  surface: {
    // slate-900/40 card fill, slate-800 border — the recurring shell
    // (rounded-xl border border-slate-800 bg-slate-900/40) used by every
    // card/chart component in the app.
    card: 'rgba(15, 23, 42, 0.4)',
    cardBorder: '#1e293b',
    tooltipBg: '#0f172a',
    tooltipBorder: '#334155',
  },
  ink: {
    primary: '#ffffff',
    secondary: '#94a3b8',
    muted: '#64748b',
    faint: '#475569',
  },
} as const

export const fonts = {
  sans: ['Inter', 'ui-sans-serif', 'system-ui'],
  mono: ['JetBrains Mono', 'ui-monospace'],
} as const
