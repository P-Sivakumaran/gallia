/**
 * Shared recharts styling, extracted from ForecastHistoryChart, TimelineChart,
 * ClubDashboard, and ModelCalibrationChart — the same axis/tooltip look was
 * hand-repeated in all four. Any new chart should spread these props onto
 * its <XAxis>/<YAxis>/<Tooltip> rather than restating the values.
 */
import { colors } from './tokens.js'

export const axisTick = { fill: colors.ink.muted, fontSize: 11 }

export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
} as const

export const tooltipContentStyle = {
  background: colors.surface.tooltipBg,
  border: `1px solid ${colors.surface.tooltipBorder}`,
  borderRadius: 8,
  fontSize: 12,
} as const

export const tooltipLabelStyle = { color: colors.ink.secondary }

export const referenceLineStyle = {
  stroke: colors.ink.faint,
  strokeWidth: 1.5,
  strokeDasharray: '4 4',
} as const
