import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import GalliaLogo from '@/components/gallia/GalliaLogo'
import SiteMain from '@/components/SiteMain'
import { BRAND } from '@/lib/brand'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Arrival motion plays once per browser session: mark <html> before first paint, unmark once it's over,
// so filter changes and later navigation don't replay it. Without JS there is no class and no motion.
const INTRO_SCRIPT = `try{var s=sessionStorage;if(!s.getItem('sf-intro')){s.setItem('sf-intro','1');var h=document.documentElement;h.classList.add('intro');setTimeout(function(){h.classList.remove('intro')},${4000})}}catch(e){}`

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['500', '700', '800'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: `${BRAND.name} — Transfer intelligence, without the noise`,
  description: 'An independent football transfer intelligence publication. Trace the source. Measure the signal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <header className="g-header">
            <GalliaLogo />
            <span className="g-brand-caption"><span>TRANSFER INTELLIGENCE</span><span>CALCIOMERCATO, QUANTIFIED.</span></span>
            <div className="g-header-right"><span className="g-edition">MILANO · EST. 2025</span><Link className="g-public-link" href="/#about-gallia">About Gallia <span aria-hidden="true">↗</span></Link></div>
          </header>
          <nav className="g-site-nav" aria-label="Site sections">
            <div className="flex gap-6 overflow-x-auto whitespace-nowrap text-sm font-medium text-ink-secondary">
              <Link href="/rumours" className="transition-colors hover:text-ink-primary">Rumours</Link>
              <Link href="/network" className="transition-colors hover:text-ink-primary">Network</Link>
              <Link href="/scorecard" className="transition-colors hover:text-ink-primary">Scorecard</Link>
            </div>
          </nav>
          <SiteMain>{children}</SiteMain>
        </AuthProvider>
      </body>
    </html>
  )
}
