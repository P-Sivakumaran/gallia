import { BRAND } from '@/lib/brand'

// Placeholder ad unit — no live ad network wired up yet. Styled to sit
// quietly inside the rumour feed rather than interrupt it, and always
// labeled so it reads as sponsored, not editorial.
const PLACEHOLDERS = [
  { title: 'Track every deal as it breaks', body: `Get the free ${BRAND.name} weekly digest.` },
  { title: 'Build your own club dashboard', body: 'Follow spend, incomings and outgoings in one view.' },
  { title: 'Never miss a "here we go"', body: 'Turn on live updates for your favourite clubs.' },
]

export default function AdSlot({ index = 0 }: { index?: number }) {
  const ad = PLACEHOLDERS[index % PLACEHOLDERS.length]

  return (
    <div className="flex items-center gap-4 rounded-xl border border-dashed border-line/60 bg-surface-panel/30 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-raised text-ink-muted">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M4 4h16v12H8l-4 4V4z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-body">{ad.title}</p>
        <p className="text-xs text-ink-muted">{ad.body}</p>
      </div>
      <span className="flex-shrink-0 rounded border border-line px-1.5 py-0.5 text-label font-semibold uppercase tracking-wide text-ink-muted">
        Ad
      </span>
    </div>
  )
}
