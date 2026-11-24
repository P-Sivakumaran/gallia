import type { ReactNode } from 'react'
import { clsx } from 'clsx'

export interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md'
}

// The repeated shell (`rounded-xl border border-slate-800 bg-slate-900/40 p-5`)
// every card and chart component in the app hand-wrote independently.
export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-800 bg-slate-900/40',
        padding === 'md' ? 'p-5' : 'p-3',
        className,
      )}
    >
      {children}
    </div>
  )
}
