import { XCircleIcon } from '@transfer-hub/design-kit'

// Ported from ForecastHistoryChart.tsx's denial annotation.
export function Default() {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950 p-4 text-xs text-slate-500">
      <XCircleIcon className="h-3.5 w-3.5 text-red-400" /> Official denial
    </div>
  )
}
