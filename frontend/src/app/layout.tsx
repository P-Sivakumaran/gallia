import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import AuthNav from '@/components/AuthNav'
import Wordmark from '@/components/Wordmark'
import { BRAND } from '@/lib/brand'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Arrival motion plays once per browser session: mark <html> before first paint, unmark once it's over,
// so filter changes and later navigation don't replay it. Without JS there is no class and no motion.
const INTRO_SCRIPT = `try{var s=sessionStorage;if(!s.getItem('sf-intro')){s.setItem('sf-intro','1');var h=document.documentElement;h.classList.add('intro');setTimeout(function(){h.classList.remove('intro')},${4000})}}catch(e){}`

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['500', '700', '800'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: `${BRAND.name} — Football Transfer Rumours, Scored`,
  description: BRAND.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-field-deep font-sans text-ink-primary antialiased">
        {/* The pitch field (raea PitchBackground): a fixed layer, so it doesn't scroll-jank on iOS */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-field">
          <div className="absolute inset-0 bg-field-grid bg-grid" />
        </div>
        <AuthProvider>
          <nav className="sticky top-0 z-50 border-b border-pitch-500/15 bg-field-deep/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-8">
              <Link href="/" aria-label={`${BRAND.name} home`}>
                <Wordmark />
              </Link>
              <div className="order-last flex w-full gap-6 overflow-x-auto whitespace-nowrap text-sm font-medium text-ink-secondary sm:order-none sm:w-auto">
                <Link href="/" className="transition-colors hover:text-ink-primary">Rumours</Link>
                <Link href="/network" className="transition-colors hover:text-ink-primary">Network</Link>
                <Link href="/scorecard" className="transition-colors hover:text-ink-primary">Scorecard</Link>
                <Link href="/pricing" className="transition-colors hover:text-ink-primary">Pricing</Link>
                <Link href="/admin" className="transition-colors hover:text-ink-primary">Admin</Link>
              </div>
              <AuthNav />
            </div>
          </nav>
          <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
