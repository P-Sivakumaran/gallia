/** @type {import('tailwindcss').Config} */
// Mirrors frontend/tailwind.config.ts's `pitch`/status colors and fonts —
// this package's components use those utility classes but ship their own
// compiled CSS (frontend's Tailwind build never sees this package's dist/).
module.exports = {
  // Previews (.design-sync/previews/) compose real components on a dark
  // canvas that mirrors frontend's layout.tsx body background — that
  // canvas class isn't used by any shipped component, so it must be in
  // the scan too or it silently never compiles (found via a white-background
  // regression in the first capture pass).
  content: ['./src/**/*.{ts,tsx}', './.design-sync/previews/**/*.tsx'],
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
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
    },
  },
  plugins: [],
}
