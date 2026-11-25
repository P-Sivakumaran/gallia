'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Desk pages lay themselves out edge to edge (DeskPage / GalliaDashboard);
// every other page keeps the centred column.
const DESK_PAGES = ['/', '/rumours', '/network', '/scorecard']

export default function SiteMain({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const fullBleed = DESK_PAGES.includes(pathname ?? '')
  return (
    <main id="main-content" className={fullBleed ? undefined : 'mx-auto max-w-7xl px-4 py-10 sm:px-8'}>
      {children}
    </main>
  )
}
