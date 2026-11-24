import { ClockIcon } from '@transfer-hub/design-kit'

// No canonical usage in the source app (unused export there) — composed to
// match the sibling icons' real usage style (small icon + inline label).
export function Default() {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950 p-4 text-xs text-slate-500">
      <ClockIcon className="h-3.5 w-3.5" /> First seen 3 days ago
    </div>
  )
}
