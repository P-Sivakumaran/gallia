'use client'

import Link from 'next/link'
import DeskPage from '@/components/desk/DeskPage'

/** Route error boundary: a failed API call shows a way forward instead of a blank page. */
export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <DeskPage eyebrow="SOMETHING WENT WRONG" title="This page couldn't load" accent=".">
      <section className="g-panel g-auth" role="alert">
        <div className="g-panel-body">
          <p>The rumour data didn&apos;t come back. It&apos;s usually brief.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={reset} className="g-btn ok">Try again</button>
            <Link href="/rumours" className="g-btn">All rumours</Link>
          </div>
        </div>
      </section>
    </DeskPage>
  )
}
