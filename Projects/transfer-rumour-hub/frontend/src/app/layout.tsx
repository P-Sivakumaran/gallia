import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import AuthNav from '@/components/AuthNav'
import { BRAND } from '@/lib/brand'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: `${BRAND.name} — Football Transfer Rumours, Scored`,
  description: BRAND.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-950 font-sans text-white antialiased">
        <AuthProvider>
          <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" className="flex items-center gap-2 whitespace-nowrap text-lg font-bold">
                <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-pitch-500" />
                {BRAND.name}
              </Link>
              <div className="order-last flex w-full gap-5 overflow-x-auto whitespace-nowrap text-sm text-slate-400 sm:order-none sm:w-auto">
                <Link href="/" className="hover:text-white transition-colors">Rumours</Link>
                <Link href="/network" className="hover:text-white transition-colors">Network</Link>
                <Link href="/scorecard" className="hover:text-white transition-colors">Scorecard</Link>
                <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
              </div>
              <AuthNav />
            </div>
          </nav>
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
