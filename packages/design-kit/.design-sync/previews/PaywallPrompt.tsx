import { PaywallPrompt } from '@transfer-hub/design-kit'

export function Default() {
  return (
    <div className="bg-slate-950 p-4">
      <PaywallPrompt
        description="Full forecast history and the probability-change timeline are part of Supporter/Pro."
        tierLabel="Supporter/Pro"
        footnote="Forecasts are estimates, not confirmations — every tier sees the same calibrated probability. Upgrading changes access and speed, not the number itself."
      />
    </div>
  )
}

export function Compact() {
  return (
    <div className="bg-slate-950 p-4">
      <PaywallPrompt
        description="Unlock the full evidence timeline."
        tierLabel="Research/API"
        compact
      />
    </div>
  )
}
