import type { PlayerAgentLink, PlayerAgentRole } from '@/types'

const ROLE_LABEL: Record<PlayerAgentRole, string> = {
  REPRESENTS: 'Represents',
  NEGOTIATED_DEAL: 'Negotiated a deal',
}

export function roleLabel(role: PlayerAgentRole): string {
  return ROLE_LABEL[role]
}

/** Public cited-agent panel. Hidden when there are no links. */
export default function AgentLinksBlock({
  links,
  onRemove,
  removingId,
  confirmId,
}: {
  links: PlayerAgentLink[]
  /** When set, each link gets a Remove control (admin). */
  onRemove?: (linkId: number) => void
  removingId?: number | null
  /** Link awaiting a second click to confirm delete. */
  confirmId?: number | null
}) {
  if (links.length === 0) return null

  return (
    <section className="g-panel g-agents" aria-labelledby="player-agents-title" data-testid="agent-links-block">
      <div className="g-panel-heading">
        <h2 id="player-agents-title">Agent</h2>
        <span className="g-count-label">{links.length} LINK{links.length === 1 ? '' : 'S'}</span>
      </div>
      <ul className="g-agent-list">
        {links.map((link) => (
          <li key={link.linkId} className="g-agent-item" data-testid="agent-link">
            <div className="g-agent-head">
              <div className="g-admin-head">
                <strong>{link.agent.name}</strong>
                <span className="g-tag">{link.agent.kind === 'PERSON' ? 'Person' : 'Agency'}</span>
                {link.agent.agency && <span className="g-note">{link.agent.agency}</span>}
              </div>
              <p className="g-agent-role">{roleLabel(link.role)}</p>
            </div>
            <p className="g-agent-reported">
              Reported by{' '}
              {link.citations.map((c, i) => (
                <span key={c.url}>
                  {i > 0 && ', '}
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="g-green-link">
                    {c.host}
                  </a>
                </span>
              ))}
            </p>
            {link.citations
              .filter((c) => c.quote)
              .map((c) => (
                <blockquote key={`${c.url}-q`} className="g-agent-quote" cite={c.url}>
                  {c.quote}
                </blockquote>
              ))}
            {onRemove && (
              <div className="g-admin-actions">
                <button
                  type="button"
                  className="g-btn bad"
                  disabled={removingId === link.linkId}
                  onClick={() => onRemove(link.linkId)}
                  aria-label={
                    confirmId === link.linkId
                      ? `Confirm remove agent link for ${link.agent.name}`
                      : `Remove agent link for ${link.agent.name}`
                  }
                >
                  {removingId === link.linkId
                    ? 'Removing…'
                    : confirmId === link.linkId
                      ? 'Confirm remove'
                      : 'Remove'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
