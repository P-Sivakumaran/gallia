import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import GalliaLogo from '@/components/gallia/GalliaLogo'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Gallia — Transfer intelligence, without the noise',
  description: 'An independent football transfer intelligence publication. Trace the source. Measure the signal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <header className="g-header">
            <GalliaLogo />
            <span className="g-brand-caption"><span>TRANSFER INTELLIGENCE</span><span>CALCIOMERCATO, QUANTIFIED.</span></span>
            <div className="g-header-right"><span className="g-edition">MILANO · EST. 2025</span><Link className="g-public-link" href="/#about-gallia">About Gallia <span aria-hidden="true">↗</span></Link></div>
          </header>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
