import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface Props {
  as?: 'p' | 'h2' | 'h3' | 'span'
  children: ReactNode
  className?: string
}

export default function SectionKicker({ as: Component = 'p', children, className }: Props) {
  return (
    <Component
      className={clsx(
        'text-label font-semibold uppercase tracking-wider text-slate-400',
        className,
      )}
    >
      {children}
    </Component>
  )
}
