import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  as?: 'p' | 'h2' | 'h3' | 'span'
  /** `md` (12px) labels a block; `lg` (14px) heads a dashboard section. */
  size?: 'md' | 'lg'
  children: ReactNode
  className?: string
}

export default function SectionKicker({ as: Component = 'p', size = 'md', children, className }: Props) {
  return (
    <Component
      className={clsx(
        size === 'lg' ? 'text-sm' : 'text-xs',
        'font-semibold uppercase tracking-widest text-ink-secondary',
        className,
      )}
    >
      {children}
    </Component>
  )
}
