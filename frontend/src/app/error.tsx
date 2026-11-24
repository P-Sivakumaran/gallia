'use client'

import Link from 'next/link'

/** Route error boundary: a failed API call shows a way forward instead of a blank page. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-xl border border-line/60 bg-card shadow-card p-8 text-center">
      <p className="font-semibold text-ink-primary">This page couldn&apos;t load.</p>
      <p className="mt-1 text-sm text-ink-muted">The rumour data didn&apos;t come back. It&apos;s usually brief.</p>
      <div className="mt-5 flex justify-center gap-3 text-sm">
        <button
          onClick={reset}
          className="rounded-lg bg-pitch-500 px-3 py-1.5 font-medium text-ink-primary transition-colors hover:bg-pitch-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-3 py-1.5 text-ink-secondary transition-colors hover:border-line-emphasis hover:text-ink-primary"
        >
          All rumours
        </Link>
      </div>
    </div>
  )
}
