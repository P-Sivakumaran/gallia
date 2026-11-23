import { AlertTriangleIcon } from '@transfer-hub/design-kit'

// Ported from ForecastCard.tsx's low-confidence warning state.
export function Default() {
  return (
    <div className="flex items-start gap-2 bg-slate-950 p-4 text-sm text-slate-300">
      <AlertTriangleIcon className="mt-1 h-6 w-6 flex-shrink-0 text-amber-400" />
      <span>Uncertainty is wide — this estimate isn&apos;t precise enough to display as a single number.</span>
    </div>
  )
}
