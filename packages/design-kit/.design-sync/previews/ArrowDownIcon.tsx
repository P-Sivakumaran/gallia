import { ArrowDownIcon } from '@transfer-hub/design-kit'

// Ported from WhyThisForecast.tsx's negative-factor row.
export function Default() {
  return (
    <div className="flex items-start gap-2 bg-slate-950 p-4 text-sm text-slate-300">
      <ArrowDownIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
      <span>Contract runs until 2028 — no release clause</span>
    </div>
  )
}
