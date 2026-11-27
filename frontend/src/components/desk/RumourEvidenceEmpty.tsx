import Link from 'next/link'

/** Empty evidence panel on a rumour detail page. */
export default function RumourEvidenceEmpty() {
  return (
    <div className="g-panel-body" data-testid="rumour-evidence-empty">
      <p>No source articles are linked to this rumour yet.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/rumours" className="g-green-link" data-testid="rumour-evidence-empty-rumours-cta">
          Browse rumours →
        </Link>
      </p>
    </div>
  )
}
