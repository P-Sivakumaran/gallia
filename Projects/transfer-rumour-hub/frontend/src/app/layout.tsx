import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Gallia — Transfer intelligence, without the noise',
  description: 'Evidence-first football transfer intelligence. Trace the source. Measure the signal.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <header className="g-header">
            <Link href="/" className="g-wordmark" aria-label="Gallia home">
              <span className="g-brand-icon" aria-hidden="true">G</span>
              GALLIA<span className="g-brand-dot" />
            </Link>
            <span className="g-brand-caption"><span>TRANSFER INTELLIGENCE</span><span>CALCIOMERCATO, QUANTIFIED.</span></span>
            <div className="g-header-right"><span className="g-edition">MILANO · EST. 2025</span><Link className="g-avatar" href="/login" aria-label="Sign in to your account">G</Link></div>
          </header>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
