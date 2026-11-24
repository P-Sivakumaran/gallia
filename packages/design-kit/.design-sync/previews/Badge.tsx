import { Badge } from '@transfer-hub/design-kit'

// Sweeps the tone axis — the primary variant of this component.
export function Tones() {
  return (
    <div className="flex flex-wrap gap-2 bg-slate-950 p-4">
      <Badge label="PENDING" tone="neutral" />
      <Badge label="COMPLETED" tone="good" />
      <Badge label="LOW STOCK" tone="warning" />
      <Badge label="HOT" tone="serious" />
      <Badge label="FAILED" tone="critical" />
    </div>
  )
}
