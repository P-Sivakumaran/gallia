import { clsx } from 'clsx'

export type BadgeTone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
  good: 'bg-green-500/20 text-green-400 border-green-500/40',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  serious: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
}

export interface BadgeProps {
  label: string
  tone?: BadgeTone
}

// Genericized from admin/page.tsx's StatusBadge — that version hardcoded
// RumourStatus ('HOT'/'PENDING'/...) to a color; this maps a tone instead,
// so any status/state vocabulary can reuse it.
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  )
}
