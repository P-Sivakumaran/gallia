/**
 * Unified chart theme tokens and Recharts/Canvas configuration.
 * Single source of truth for SVG/Canvas data visualization colors and typography.
 */

export const chartColors = {
  axis: '#64748b',
  tooltipBg: '#0f172a',
  tooltipBorder: '#334155',
  tooltipLabel: '#94a3b8',
  tooltipItem: '#22c55e',
  grid: '#475569',
  track: '#1e293b',
  success: '#22c55e',
  danger: '#ef4444',
  hot: '#f97316',
  pending: '#94a3b8',
  clubNode: '#60a5fa',
  playerNode: '#8b5cf6',
} as const

export const axisTick = {
  fill: chartColors.axis,
  fontSize: 11,
} as const

export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
} as const

export const tooltipStyle = {
  contentStyle: {
    background: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: chartColors.tooltipLabel },
  itemStyle: { color: chartColors.tooltipItem },
} as const

export const referenceLineStyle = {
  stroke: chartColors.grid,
  strokeWidth: 1.5,
  strokeDasharray: '4 4',
} as const
