import { ArrowUpIcon } from '@transfer-hub/design-kit'

// Ported from WhyThisForecast.tsx's positive-factor row.
export function Default() {
  return (
    <div className="flex items-start gap-2 bg-slate-950 p-4 text-sm text-slate-300">
      <ArrowUpIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-pitch-500" />
      <span>Player has publicly requested a transfer</span>
    </div>
  )
}
