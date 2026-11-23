import { LinkIcon } from '@transfer-hub/design-kit'

// Ported from WhyThisForecast.tsx's "view source" link row.
export function Default() {
  return (
    <div className="flex items-center gap-1 bg-slate-950 p-4 text-xs text-pitch-500">
      <LinkIcon className="h-3 w-3" /> View source
    </div>
  )
}
