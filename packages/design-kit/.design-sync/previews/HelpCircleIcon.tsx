import { HelpCircleIcon } from '@transfer-hub/design-kit'

// Ported from WhyThisForecast.tsx's "insufficient data" explanation row.
export function Default() {
  return (
    <div className="flex items-start gap-2 bg-slate-950 p-4 text-sm text-slate-300">
      <HelpCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
      <span>Not enough resolved outcomes yet to show a calibrated probability.</span>
    </div>
  )
}
