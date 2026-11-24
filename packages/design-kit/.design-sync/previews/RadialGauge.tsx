import { RadialGauge, colors } from '@transfer-hub/design-kit'

// Sweeps size — the primary variant axis.
export function Sizes() {
  return (
    <div className="flex flex-wrap items-end gap-6 bg-slate-950 p-4">
      <RadialGauge value={42} label="PENDING" color={colors.status.pending} size="sm" />
      <RadialGauge value={78} label="HOT" color={colors.status.hot} size="md" />
      <RadialGauge value={91} label="DONE" color={colors.status.completed} size="lg" />
    </div>
  )
}

// A failed/low-score case, since the color mapping isn't always green.
export function LowScore() {
  return (
    <div className="bg-slate-950 p-4">
      <RadialGauge value={12} label="FAILED" color={colors.status.failed} size="md" />
    </div>
  )
}
