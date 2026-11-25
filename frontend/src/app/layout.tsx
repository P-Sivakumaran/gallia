import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import GalliaLogo from '@/components/gallia/GalliaLogo'
import SiteMain from '@/components/SiteMain'
import SiteNav from '@/components/desk/SiteNav'
import { BRAND } from '@/lib/brand'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['500', '700', '800'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: `${BRAND.name} — Transfer intelligence, without the noise`,
  description: 'An independent football transfer intelligence publication. Trace the source. Measure the signal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <header className="g-header">
            <GalliaLogo />
            <span className="g-brand-caption"><span>TRANSFER INTELLIGENCE</span><span>CALCIOMERCATO, QUANTIFIED.</span></span>
            <div className="g-header-right"><span className="g-edition">MILANO · EST. 2025</span><Link className="g-public-link" href="/#about-gallia">About Gallia <span aria-hidden="true">↗</span></Link></div>
          </header>
          <SiteNav />
          <SiteMain>{children}</SiteMain>
        </AuthProvider>
      </body>
    </html>
  )
}
