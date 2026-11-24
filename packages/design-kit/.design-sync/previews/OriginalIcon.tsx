import { OriginalIcon } from '@transfer-hub/design-kit'

// Ported from EvidenceTimeline.tsx's "original reporting" evidence marker.
export function Default() {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950 p-4 text-sm text-slate-300">
      <OriginalIcon className="h-4 w-4 text-amber-400" /> Original reporting
    </div>
  )
}
