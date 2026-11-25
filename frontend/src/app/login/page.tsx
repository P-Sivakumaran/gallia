'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import DeskPage from '@/components/desk/DeskPage'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(email, password)
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <DeskPage eyebrow="ACCOUNT" title="Log in" intro="For the desk's editors. Reading Gallia needs no account.">
      <section className="g-panel g-auth">
        <form onSubmit={onSubmit}>
          <div className="g-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="g-input" />
          </div>
          <div className="g-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="g-input" />
          </div>
          {error && <p className="g-error" role="alert">{error}</p>}
          <button type="submit" disabled={pending} className="g-btn primary">
            {pending ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </section>
    </DeskPage>
  )
}
