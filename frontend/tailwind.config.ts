import type { Config } from 'tailwindcss'
import {
  card,
  caution,
  chartHeight,
  credibility,
  entity,
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
      },
      backgroundImage: {
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
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      // Motion ported from the raea brand kit. Every keyframe ends on the element's resting style,
      // so server-rendered markup is correct with no JS, and reduced motion (globals.css) lands on it at once.
      keyframes: {
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
  plugins: [],
}

export default config
