import { clsx } from 'clsx'

/** Source reliability as five squares (raea RumourCardMotion), with the percentage for screen readers. */
export default function ReliabilityBar({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const filled = Math.round(score * 5)
  return (
    <span className="inline-flex items-center gap-1">
      <span className="sr-only">{Math.round(score * 100)}% reliable source</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx(
            size === 'lg' ? 'h-4 w-4 rounded' : 'h-2 w-2 rounded-sm',
            i < filled ? 'bg-pitch-500' : 'bg-surface-overlay',
          )}
        />
      ))}
    </span>
  )
}
