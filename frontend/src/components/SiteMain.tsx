'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Desk pages lay themselves out edge to edge (DeskPage / GalliaDashboard);
// every other page keeps the centred column.
const DESK_PAGES = ['/', '/rumours', '/network', '/scorecard', '/admin', '/login', '/watchlist']
const DESK_PREFIXES = ['/rumour/', '/player/', '/club/', '/claim/']

export default function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const path = pathname ?? ''
  const fullBleed = DESK_PAGES.includes(path) || DESK_PREFIXES.some((p) => path.startsWith(p))
  return (
    <main id="main-content" className={fullBleed ? undefined : 'mx-auto max-w-7xl px-4 py-10 sm:px-8'}>
      {children}
    </main>
  )
}
