import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
import {
  card,
  caution,
  cue,
  feedStagger,
  feedStaggerMax,
  radarTurn,
  chartHeight,
  credibility,
  entity,
  field,
  ink,
  line,
  meter,
  motion,
  networkNode,
  pitch,
  sourceKind,
  status,
  surface,
} from './src/lib/tokens'

const OUT_CUBIC = 'cubic-bezier(0.33, 1, 0.68, 1)'
const IN_OUT_CUBIC = 'cubic-bezier(0.65, 0, 0.35, 1)'

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
      // Motion ported from the raea brand kit. Every keyframe ends on the element's resting style,
      // so server-rendered markup is correct with no JS, and reduced motion (globals.css) lands on it at once.
      gridTemplateColumns: {
        // label column + value column (the Rumour of the Day route box)
        route: 'auto minmax(0, 1fr)',
        // home hero: text and card, then the meter
        hero: 'minmax(0, 1.15fr) minmax(0, 1fr)',
      },
      backgroundSize: {
        grid: '90px 90px, 90px 90px, 100% 320px',
      },
      letterSpacing: {
        display: '-0.035em',
        kicker: '0.14em',
      },
      keyframes: {
        'radar-sweep': { from: { transform: 'rotate(-360deg)' } },
        rise: { from: { opacity: '0', transform: 'translateY(14px)' } },
        'fade-in': { from: { opacity: '0' } },
        'draw-in': { from: { strokeDashoffset: '1' } },
        'blip-on': {
          '0%': { opacity: '0.15', transform: 'scale(0.6)' },
          '55%': { opacity: '1', transform: 'scale(1.35)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slam: {
          '0%': { opacity: '0', transform: 'scale(1.16)' },
          '60%': { opacity: '1', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'digit-roll': { from: { opacity: '0', transform: 'translateY(55%)' } },
        'card-flash': {
          from: { opacity: '0.95', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(1.025)' },
        },
        'ticker-in': { from: { transform: 'translateY(100%)', opacity: '0' } },
        'meter-build': { from: { strokeDashoffset: 'var(--meter-c)' } },
        'meter-sweep': { from: { strokeDashoffset: 'var(--meter-c)' } },
        'meter-cursor': { from: { transform: 'rotate(0deg)' } },
        'meter-fade': { from: { opacity: '0' } },
        'status-pop': {
          '0%': { transform: 'scale(0.82)' },
          '50%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        'meter-pulse': {
          from: { transform: 'scale(1)', opacity: '0.8' },
          to: { transform: 'scale(1.28)', opacity: '0' },
        },
        'delta-chip': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '11%': { opacity: '1', transform: 'translateY(0)' },
          '85%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(0)' },
        },
      },
      animation: {
        'meter-build': `meter-build ${motion.build}ms ${IN_OUT_CUBIC} backwards`,
        'meter-sweep': `meter-sweep ${motion.sweep}ms ${OUT_CUBIC} ${motion.build * 0.6}ms backwards`,
        'meter-cursor': `meter-cursor ${motion.sweep}ms ${OUT_CUBIC} ${motion.build * 0.6}ms backwards`,
        'meter-fade': `meter-fade ${motion.sweep}ms ${OUT_CUBIC} ${motion.build}ms backwards`,
        'status-pop': `status-pop ${motion.pop}ms ${OUT_CUBIC}`,
        'meter-pulse': `meter-pulse ${motion.flash}ms ${OUT_CUBIC} both`,
        'delta-chip': `delta-chip ${motion.chip}ms linear both`,
        // Arrival moves start at their element's --cue (cue-* utilities below)
        'radar-sweep': `radar-sweep ${radarTurn}ms ${OUT_CUBIC} var(--cue, 0ms) backwards`,
        rise: `rise 520ms ${OUT_CUBIC} var(--cue, 0ms) backwards`,
        'fade-in': `fade-in 520ms ${OUT_CUBIC} var(--cue, 0ms) backwards`,
        'draw-in': `draw-in 420ms ${OUT_CUBIC} var(--cue, 0ms) backwards`,
        'blip-on': `blip-on 420ms ${OUT_CUBIC} var(--cue, 0ms) backwards`,
        slam: `slam 380ms ${OUT_CUBIC} var(--cue, 0ms) backwards`,
        'digit-roll': `digit-roll ${motion.tween}ms ${OUT_CUBIC}`,
        'card-flash': `card-flash ${motion.flash}ms ${OUT_CUBIC} both`,
        'ticker-in': `ticker-in ${motion.tween}ms ${OUT_CUBIC} backwards`,
      },
      transitionProperty: {
        meter: 'stroke-dashoffset, stroke',
      },
      transitionDuration: {
        tween: `${motion.tween}ms`,
      },
      transitionTimingFunction: {
        tween: IN_OUT_CUBIC,
      },
    },
  },
  plugins: [
    plugin(({ addVariant, addUtilities }) => {
      // `intro:` applies only while <html> has .intro: the first load of a session (see app/layout.tsx).
      addVariant('intro', '.intro &')
      addUtilities({
        ...Object.fromEntries(Object.entries(cue).map(([k, ms]) => [`.cue-${k}`, { '--cue': `${ms}ms` }])),
        ...Object.fromEntries(
          Array.from({ length: feedStaggerMax }, (_, i) => [`.cue-feed-${i}`, { '--cue': `${i * feedStagger}ms` }]),
        ),
      })
    }),
  ],
}

export default config
