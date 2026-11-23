import { Chip } from '@transfer-hub/design-kit'

// Sweeps active/inactive — the filter-toggle's only state.
export function States() {
  return (
    <div className="flex flex-wrap gap-2 bg-slate-950 p-4">
      <Chip label="Premier League" active />
      <Chip label="La Liga" />
      <Chip label="Bundesliga" />
    </div>
  )
}
