import { Card } from '@transfer-hub/design-kit'

export function Default() {
  return (
    <div className="bg-slate-950 p-4">
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Forecast history</p>
        <p className="mt-2 text-sm text-slate-400">The default card shell used by every chart and stat block in the app.</p>
      </Card>
    </div>
  )
}

export function Compact() {
  return (
    <div className="bg-slate-950 p-4">
      <Card padding="sm">
        <p className="text-sm text-slate-300">Compact padding, used for admin table rows and dense lists.</p>
      </Card>
    </div>
  )
}
