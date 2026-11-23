import { clsx } from 'clsx'
import { BRAND } from '@/lib/brand'

/**
 * Wordmark from the raea brand kit: a pitch-green dot and the name in heavy Inter with the
 * last word in pitch green ("Transfer Rumour Hub" in the kit). Built from BRAND.name, so the
 * pending rename stays a one-line change in lib/brand.ts.
 */
export default function Wordmark({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  const words = BRAND.name.split(' ')
  const last = words.pop()
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2.5 whitespace-nowrap font-black tracking-display',
        size === 'lg' ? 'text-3xl' : 'text-xl',
        className,
      )}
    >
      <span aria-hidden className={clsx('shrink-0 rounded-full bg-pitch-500', size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5')} />
      <span>
        {words.join(' ')} <span className="text-pitch-500">{last}</span>
      </span>
    </span>
  )
}
