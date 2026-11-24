import { clsx } from 'clsx'

export interface PaywallPromptProps {
  description: string
  tierLabel: string
  ctaLabel?: string
  ctaHref?: string
  footnote?: string
  compact?: boolean
  onCtaClick?: () => void
}

// Genericized from UpgradePrompt.tsx — that version was tied to
// EntitlementTier and fired a specific analytics event via next/link; this
// takes plain labels/href and an optional onCtaClick, framework-agnostic.
export function PaywallPrompt({
  description,
  tierLabel,
  ctaLabel = "See what's included →",
  ctaHref = '#',
  footnote,
  compact = false,
  onCtaClick,
}: PaywallPromptProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-700/60 bg-slate-800/40',
        compact ? 'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5' : 'space-y-2 p-4',
      )}
    >
      <p className="text-sm text-slate-400">{description}</p>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {tierLabel}
        </span>
        <a
          href={ctaHref}
          onClick={onCtaClick}
          className="rounded-lg bg-pitch-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-pitch-600"
        >
          {ctaLabel}
        </a>
      </div>
      {footnote && <p className="text-[11px] text-slate-600">{footnote}</p>}
    </div>
  )
}
