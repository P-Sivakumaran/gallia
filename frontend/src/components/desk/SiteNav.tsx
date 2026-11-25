'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './desk.css'

const LINKS = [
  { href: '/', label: 'Desk' },
  { href: '/rumours', label: 'Rumours' },
  { href: '/network', label: 'Network' },
  { href: '/scorecard', label: 'Scorecard' },
]

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  // /rumour/[id] belongs to Rumours.
  if (href === '/rumours') return pathname.startsWith('/rumours') || pathname.startsWith('/rumour/')
  return pathname.startsWith(href)
}

export default function SiteNav() {
  const pathname = usePathname() ?? '/'
  return (
    <nav className="g-site-nav" aria-label="Site sections">
      <div className="g-site-tabs">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={isActive(pathname, l.href) ? 'page' : undefined}>{l.label}</Link>
        ))}
      </div>
    </nav>
  )
}
