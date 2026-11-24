'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// The Gallia desk on "/" lays itself out edge to edge; every other page keeps the centred column.
export default function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fullBleed = pathname === '/'
  return (
    <main id="main-content" className={fullBleed ? undefined : 'mx-auto max-w-7xl px-4 py-10 sm:px-8'}>
      {children}
    </main>
  )
}
