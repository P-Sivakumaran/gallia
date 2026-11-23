/**
 * Recharts and Sigma configuration built from the design tokens.
 * Colours live in ./tokens; this file only says which token each chart part uses.
 */
import { chartHeight, ink, line, networkNode, status, surface } from './tokens'

export { chartHeight }

export const chartColors = {
  axis: ink.muted,
  tooltipBg: surface.panel,
  tooltipBorder: line.DEFAULT,
  tooltipLabel: ink.secondary,
  tooltipItem: status.completed.DEFAULT,
  /** Graph node labels drawn on the Sigma canvas */
  canvasLabel: ink.secondary,
  /** Chart surface behind marks; marker outlines use it to cut them out */
  plotBg: surface.panel,
  grid: line.strong,
  track: surface.raised,
  success: status.completed.DEFAULT,
  danger: status.failed.DEFAULT,
  hot: status.hot.DEFAULT,
  pending: status.pending.DEFAULT,
  playerNode: networkNode.player,
  clubNode: networkNode.club,
} as const

export const axisTick = {
  fill: chartColors.axis,
  fontSize: 12,
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
