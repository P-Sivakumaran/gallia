'use client'

import Link from 'next/link'
import { useAuth } from './AuthProvider'

export default function AuthNav() {
  const { user, loading, logout } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <div className="ml-auto flex items-center gap-3 text-sm">
        <Link href="/login" className="text-ink-secondary hover:text-ink-primary transition-colors">
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-pitch-500 px-3 py-1.5 font-medium text-ink-primary hover:bg-pitch-600 transition-colors"
        >
          Sign up
        </Link>
      </div>
    )
  }

  return (
    <div className="ml-auto flex items-center gap-4 text-sm">
      <Link href="/watchlist" className="text-ink-secondary hover:text-ink-primary transition-colors">
        Watchlist
      </Link>
      <span className="text-ink-faint">{user.email}</span>
      <button onClick={() => logout()} className="text-ink-secondary hover:text-ink-primary transition-colors">
        Log out
      </button>
    </div>
  )
}
