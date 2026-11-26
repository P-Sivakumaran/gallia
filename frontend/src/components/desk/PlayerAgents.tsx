'use client'

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ApiError, api } from '@/lib/api'
import type { AgentKind, PlayerAgentLink, PlayerAgentRole } from '@/types'
import AgentLinksBlock from './AgentLinksBlock'

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | undefined
    if (body?.error) return body.error
  }
  if (err instanceof Error) return err.message
  return 'Request failed'
}

export default function PlayerAgents({
  playerId,
  initialLinks,
}: {
  playerId: number
  initialLinks: PlayerAgentLink[]
}) {
  const [links, setLinks] = useState(initialLinks)
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)

  const [agentName, setAgentName] = useState('')
  const [agentKind, setAgentKind] = useState<AgentKind>('PERSON')
  const [agencyName, setAgencyName] = useState('')
  const [role, setRole] = useState<PlayerAgentRole>('REPRESENTS')
  const [rumourId, setRumourId] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [quote, setQuote] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: number; name: string; kind: AgentKind; agency: string | null }[]>([])
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)
  const listId = useId()
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const next = await api.players.agents(playerId).catch(() => [])
    setLinks(next)
  }, [playerId])

  useEffect(() => {
    setLinks(initialLinks)
  }, [initialLinks])

  useEffect(() => {
    let cancelled = false
    api.admin
      .playerAgents(playerId)
      .then((adminLinks) => {
        if (cancelled) return
        setIsAdmin(true)
        setLinks(adminLinks)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [playerId])

  function onNameChange(value: string) {
    setAgentName(value)
    if (debounce.current) clearTimeout(debounce.current)
    if (!value.trim() || !isAdmin) {
      setSuggestions([])
      return
    }
    debounce.current = setTimeout(() => {
      api.admin
        .agents(value.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 200)
  }

  function pickSuggestion(name: string, kind: AgentKind, agency: string | null) {
    setAgentName(name)
    setAgentKind(kind)
    if (agency) setAgencyName(agency)
    setSuggestions([])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormOk(null)
    setPending(true)
    try {
      const rumour = rumourId.trim() ? parseInt(rumourId, 10) : null
      if (rumourId.trim() && (rumour === null || Number.isNaN(rumour))) {
        setFormError('Rumour id must be a number')
        return
      }
      await api.admin.addAgentLink({
        playerId,
        agentName: agentName.trim(),
        agentKind,
        agencyName: agentKind === 'PERSON' && agencyName.trim() ? agencyName.trim() : null,
        role,
        rumourId: role === 'NEGOTIATED_DEAL' ? rumour : null,
        sourceUrl: sourceUrl.trim(),
        quote: quote.trim() || null,
      })
      setFormOk('Citation saved.')
      setSourceUrl('')
      setQuote('')
      await refresh()
    } catch (err) {
      setFormError(errorText(err))
    } finally {
      setPending(false)
    }
  }

  async function removeLink(linkId: number) {
    if (confirmId !== linkId) {
      setConfirmId(linkId)
      return
    }
    setRemovingId(linkId)
    setFormError(null)
    try {
      await api.admin.removeAgentLink(linkId)
      setConfirmId(null)
      await refresh()
    } catch (err) {
      setFormError(errorText(err))
    } finally {
      setRemovingId(null)
    }
  }

  const showPublic = links.length > 0
  if (!showPublic && !isAdmin) return null

  return (
    <div className="g-stack g-agents-stack">
      <AgentLinksBlock
        links={links}
        onRemove={isAdmin ? removeLink : undefined}
        removingId={removingId}
        confirmId={confirmId}
      />
      {isAdmin && (
        <section className="g-panel g-agents-form" aria-labelledby="add-agent-title">
          <div className="g-panel-heading">
            <h2 id="add-agent-title">Add agent citation</h2>
          </div>
          <form className="g-agent-form" onSubmit={onSubmit}>
            <div className="g-field" style={{ position: 'relative' }}>
              <label htmlFor={`${listId}-name`}>Agent name</label>
              <input
                id={`${listId}-name`}
                className="g-input"
                required
                minLength={2}
                maxLength={120}
                autoComplete="off"
                value={agentName}
                onChange={(e) => onNameChange(e.target.value)}
                aria-autocomplete="list"
                aria-controls={`${listId}-suggest`}
              />
              {suggestions.length > 0 && (
                <ul id={`${listId}-suggest`} className="g-agent-suggest" role="listbox" aria-label="Matching agents">
                  {suggestions.map((s) => (
                    <li key={s.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => pickSuggestion(s.name, s.kind, s.agency)}
                      >
                        {s.name}
                        <span className="g-note"> · {s.kind === 'PERSON' ? 'Person' : 'Agency'}{s.agency ? ` · ${s.agency}` : ''}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="g-agent-form-row">
              <div className="g-field">
                <label htmlFor={`${listId}-kind`}>Kind</label>
                <select
                  id={`${listId}-kind`}
                  className="g-input"
                  value={agentKind}
                  onChange={(e) => setAgentKind(e.target.value as AgentKind)}
                >
                  <option value="PERSON">Person</option>
                  <option value="AGENCY">Agency</option>
                </select>
              </div>
              <div className="g-field">
                <label htmlFor={`${listId}-role`}>Role</label>
                <select
                  id={`${listId}-role`}
                  className="g-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as PlayerAgentRole)}
                >
                  <option value="REPRESENTS">Represents</option>
                  <option value="NEGOTIATED_DEAL">Negotiated a deal</option>
                </select>
              </div>
            </div>
            {agentKind === 'PERSON' && (
              <div className="g-field">
                <label htmlFor={`${listId}-agency`}>Agency (optional)</label>
                <input
                  id={`${listId}-agency`}
                  className="g-input"
                  maxLength={120}
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </div>
            )}
            {role === 'NEGOTIATED_DEAL' && (
              <div className="g-field">
                <label htmlFor={`${listId}-rumour`}>Rumour id (optional)</label>
                <input
                  id={`${listId}-rumour`}
                  className="g-input"
                  inputMode="numeric"
                  value={rumourId}
                  onChange={(e) => setRumourId(e.target.value)}
                />
              </div>
            )}
            <div className="g-field">
              <label htmlFor={`${listId}-url`}>Article URL</label>
              <input
                id={`${listId}-url`}
                className="g-input"
                type="url"
                required
                placeholder="https://publisher.example/article"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
            <div className="g-field">
              <label htmlFor={`${listId}-quote`}>Quote (optional, 300 chars)</label>
              <textarea
                id={`${listId}-quote`}
                className="g-input g-textarea"
                maxLength={300}
                rows={3}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
            </div>
            {formError && <p className="g-error" role="alert">{formError}</p>}
            {formOk && <p className="g-note" role="status">{formOk}</p>}
            <button type="submit" className="g-btn primary" disabled={pending}>
              {pending ? 'Saving…' : 'Add citation'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
