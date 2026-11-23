import { CopyIcon } from '@transfer-hub/design-kit'

// Ported from EvidenceTimeline.tsx's "duplicate/syndicated" evidence marker.
export function Default() {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950 p-4 text-sm text-slate-300">
      <CopyIcon className="h-4 w-4 text-slate-500" /> Syndicated from another outlet
    </div>
  )
}
