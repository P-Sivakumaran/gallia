import { clsx } from 'clsx'

export interface ChipProps {
  label: string
  active?: boolean
  onClick?: () => void
}

// Genericized from FilterBar.tsx's inline Chip — that version was tied to
// URLSearchParams filter state; this just takes active/onClick.
export function Chip({ label, active = false, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-pitch-500 bg-pitch-500/20 text-pitch-500'
          : 'border-slate-700 bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200',
      )}
    >
      {label}
    </button>
  )
}
