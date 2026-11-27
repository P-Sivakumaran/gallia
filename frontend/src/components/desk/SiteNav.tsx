'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './desk.css'

const LINKS = [
  { href: '/', label: 'Desk' },
  { href: '/rumours', label: 'Rumours' },
  { href: '/leagues', label: 'Leagues' },
  { href: '/network', label: 'Network' },
  { href: '/scorecard', label: 'Scorecard' },
]

export function isActive(pathname: string, href: string): boolean {
  // Watchlist is an account surface off the home desk.
  if (href === '/') return pathname === '/' || pathname.startsWith('/watchlist')
  // /rumour/[id] belongs to Rumours.
  if (href === '/rumours') return pathname.startsWith('/rumours') || pathname.startsWith('/rumour/')
  // Club, match, player and compare sit in the football desk with Leagues.
  if (href === '/leagues') {
    return (
      pathname.startsWith('/leagues') ||
      pathname.startsWith('/club/') ||
      pathname.startsWith('/match/') ||
      pathname.startsWith('/player/') ||
      pathname.startsWith('/compare')
    )
  }
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
