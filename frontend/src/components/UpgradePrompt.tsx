'use client'

import { clsx } from 'clsx'
import type { EntitlementTier } from '@/types'

interface Props {
  // What the copy describes — functionality only, never accuracy. See
  // docs/monetisation-proposal.md "Competitor / reputational risks":
  // upgrade copy must never imply a paying user gets better predictions.
  description: string
  requiredTier: EntitlementTier
  featureKey: string
  compact?: boolean
}

const TIER_LABEL: Record<EntitlementTier, string> = {
  FREE: 'Free',
  PRO: 'Supporter/Pro',
  RESEARCH: 'Research/API',
}

// Describes a feature limit. There is no pricing page or checkout: Gallia is
// a public website, so this only explains why a feature is unavailable.
export default function UpgradePrompt({ description, requiredTier, compact = false }: Props) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-line/60 bg-surface-raised/40',
        compact ? 'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5' : 'space-y-2 p-4',
      )}
      data-testid="upgrade-prompt"
    >
      <p className="text-sm text-ink-secondary">{description}</p>
      <span className="rounded-full border border-line px-2.5 py-0.5 text-label font-semibold uppercase tracking-wide text-ink-muted">
        {TIER_LABEL[requiredTier]}
      </span>
      <p className="text-label text-ink-faint">
        Forecasts are estimates, not confirmations — every tier sees the same calibrated probability. Upgrading
        changes access and speed, not the number itself.
      </p>
    </div>
  )
}
