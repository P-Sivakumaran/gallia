import SectionKicker from '@/components/SectionKicker'

// Transparent upgrade UI (requirement 4) — describes functionality only.
// No checkout: payment processing is explicitly out of scope for this
// implementation (docs/monetisation-proposal.md). Entitlements are granted
// manually today (see backend POST /admin/users/:id/entitlement); there is
// deliberately no "Buy now" button here yet.

const TIERS = [
  {
    name: 'Free',
    tagline: 'Everything you need to follow the market.',
    popular: false,
    features: [
      'Current rumours',
      'Provenance and source labels on every claim',
      'Watchlist up to 5 players',
      'Delayed alerts',
      'Full methodology visibility',
    ],
  },
  {
    name: 'Supporter/Pro',
    tagline: 'For fans tracking a lot, closely.',
    popular: true,
    features: [
      'Unlimited watchlist',
      'Instant alerts for confirmation, denial, or a large forecast move',
      'Full forecast history and probability-change timeline',
      'Advanced filters (source tier, league, window)',
      'CSV export of your own watchlist, where legally permitted',
    ],
  },
  {
    name: 'Research/API',
    tagline: 'For people building on top of the data.',
    popular: false,
    features: [
      'Documented, rate-limited API access',
      'Provenance-root and evidence metadata',
      'Historical resolved-claim datasets',
      'Stable programmatic access to model-health history (the public scorecard stays free)',
      'Explicit data-license and attribution terms',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <SectionKicker>Access & Entitlements</SectionKicker>
        <h1 className="text-3xl font-black tracking-display text-ink-primary sm:text-4xl">
          Tier <span className="text-pitch-500">Plans.</span>
        </h1>
        <p className="max-w-2xl text-sm text-ink-secondary">
          Every tier sees the same calibrated forecast, computed the same way. Upgrading changes how much history,
          how many watchlist slots, and how fast alerts arrive — never the number itself, and never what evidence is
          visible. Official confirmation is the only confirmed status; a forecast is always an estimate.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col rounded-xl border bg-card p-5 shadow-card ${
              tier.popular ? 'border-pitch-500/60 ring-1 ring-pitch-500/30' : 'border-line/60'
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-2.5 right-4 rounded-full border border-pitch-500/50 bg-pitch-900/90 px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-wider text-pitch-500">
                Popular
              </span>
            )}
            <h2 className="text-lg font-bold tracking-display text-ink-primary">{tier.name}</h2>
            <p className="mt-1 text-xs text-ink-muted">{tier.tagline}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-secondary">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-pitch-500" aria-hidden>
                    ✓
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="rounded-xl border border-line/60 bg-card shadow-card p-4 text-xs text-ink-muted">
        Payment isn&apos;t live yet — plans are granted manually while this packaging is being validated. See{' '}
        <span className="font-mono">docs/monetisation-proposal.md</span> for the full reasoning, including why
        contradicting evidence and official denials are never restricted by tier.
      </p>
    </div>
  )
}
