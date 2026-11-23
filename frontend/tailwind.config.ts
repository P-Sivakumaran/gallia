import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          900: '#052e16',
        },
        hot: '#f97316',
        completed: '#22c55e',
        failed: '#ef4444',
        pending: '#94a3b8',
        denied: '#6b7280',
        surface: {
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
      },
      fontSize: {
        micro: ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        label: ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
      },
      height: {
        'canvas-lg': '40rem',
        'canvas-md': '37.5rem',
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
