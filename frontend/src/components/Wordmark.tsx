import { clsx } from 'clsx'

/**
 * Wordmark: a pitch-green dot and the name in heavy Inter.
 */
export default function Wordmark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2.5 whitespace-nowrap font-black tracking-display',
        size === 'lg' ? 'text-3xl' : 'text-xl',
        className,
      )}
    >
      <span aria-hidden className={clsx('shrink-0 rounded-full bg-pitch-500', size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5')} />
      <span className="text-ink-primary">
        Gallia
      </span>
    </span>
  )
}
