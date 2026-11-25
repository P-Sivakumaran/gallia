'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { GalliaClaim, GalliaEvidence, GalliaWorkspace } from '@/lib/gallia-types'
import { DeltaChip, EvidenceBalance, Icon, ProbabilityMeter, Sparkline, StatusBadge } from './Primitives'
import './gallia.css'

const tabs = [
  { name: 'Intelligence', shortName: 'Desk', icon: 'grid' },
  { name: 'Reading list', shortName: 'Saved', icon: 'star' },
  { name: 'Sources & provenance', shortName: 'Sources', icon: 'branch' },
  { name: 'Calibration', shortName: 'Calibration', icon: 'chart' },
]

function PanelTitle({ icon, title, right }: { icon: string; title: string; right?: ReactNode }) {
  return <div className="g-panel-heading"><h2><Icon name={icon} size={16} />{title}</h2>{right}</div>
}

function StoryList({ stories, onOpen, onRemove }: { stories: GalliaClaim[]; onOpen: (claim: GalliaClaim) => void; onRemove?: (id: string) => void }) {
  return (
    <div className="g-watchlist-items">
      {stories.map((claim) => (
        <div className="g-watch-item" key={claim.id}>
          <div className="g-player-monogram" aria-hidden="true">{claim.name.split(' ').map((word) => word[0]).slice(0, 2).join('')}</div>
          <button className="g-watch-name" onClick={() => onOpen(claim)}><strong>{claim.name}</strong><span>{claim.from} → {claim.to}</span></button>
          <div className="g-watch-value"><strong>{claim.probability !== null ? `${claim.probability}%` : '—'}</strong><DeltaChip value={claim.delta} /></div>
          {onRemove && <button className="g-icon-button g-watch-remove" onClick={() => onRemove(claim.id)} aria-label={`Remove ${claim.name} from reading list`}><Icon name="close" size={14} /></button>}
        </div>
      ))}
      {!stories.length && <p className="g-empty">Nothing saved yet. Use the star beside a story to keep it here for this visit.</p>}
    </div>
  )
}

function EvidenceNode({ evidence }: { evidence: GalliaEvidence }) {
  return <details className={`g-evidence-node ${evidence.direction.toLowerCase()}`}>
    <summary><span className="g-evidence-point" /><span className="g-node-body"><span className="g-node-top"><strong>{evidence.source}</strong><span className="g-tier">{evidence.tier ? `TIER ${evidence.tier}` : 'UNRATED'}</span></span><span className="g-node-title">{evidence.title}</span><span className="g-node-bottom"><span>{evidence.direction}</span><time>{evidence.time}</time></span></span><Icon name="down" size={14} /></summary>
    <div className="g-evidence-excerpt"><p>{evidence.excerpt}</p>{evidence.parentId && <p className="g-muted">Derived from signal {evidence.parentId}; not an independent origin.</p>}{evidence.url && <a href={evidence.url} target="_blank" rel="noreferrer">View original source <Icon name="external" size={14} /></a>}</div>
  </details>
}

function Modal({ title, onClose, children, variant = 'default' }: { title: string; onClose: () => void; children: ReactNode; variant?: 'default' | 'dossier' | 'drawer' }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow; element?.close() }
  }, [])
  return <dialog ref={dialog} aria-label={title} className={`g-dialog g-dialog-${variant}`} onCancel={onClose} onClick={(e) => { if (e.target === dialog.current) onClose() }}>
    <div className="g-dialog-inner"><div className="g-dialog-top"><span className="g-eyebrow">{title}</span><button className="g-icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></div>{children}</div>
  </dialog>
}

export default function GalliaDashboard({ workspace }: { workspace: GalliaWorkspace }) {
  const [tab, setTab] = useState('Intelligence')
  const [query, setQuery] = useState('')
  const [league, setLeague] = useState('All leagues')
  const [status, setStatus] = useState('All signals')
  const [tier, setTier] = useState('All tiers')
  const [sort, setSort] = useState('Signal strength')
  const [saved, setSaved] = useState<string[]>([])
  const [selected, setSelected] = useState<GalliaClaim | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [methodology, setMethodology] = useState(false)
  const [notice, setNotice] = useState('')
  // Live editions can hold dozens of stories and resolved calls; show a page at a time.
  const [feedLimit, setFeedLimit] = useState(12)
  const [ledgerLimit, setLedgerLimit] = useState(10)
  const [sourceLimit, setSourceLimit] = useState(12)
  const search = useRef<HTMLInputElement>(null)
  const demo = workspace.mode === 'illustrative'
  // Live desk: likelihoods come from the heuristic scoring engine and are labelled as estimates.
  const heuristic = !demo && workspace.forecastBasis === 'heuristic'
  const claims = workspace.claims
  const hero = claims[0]
  const tickerClaims = workspace.ticker?.length
    ? workspace.ticker.map((t) => ({ claim: claims.find((c) => c.id === t.id), age: t.age })).filter((t): t is { claim: GalliaClaim; age: string } => !!t.claim)
    : claims.slice(0, 3).map((claim, i) => ({ claim, age: demo ? ['+12s', '+45s', '+2m'][i] : 'RECORD' }))
  const metrics = workspace.metrics
  const ledger = workspace.ledger
  const leagueOptions = workspace.leagues?.length ? workspace.leagues : ['Premier League', 'Serie A', 'La Liga', 'Bundesliga', 'Ligue 1']
  const toggleSave = (id: string) => {
    const already = saved.includes(id)
    setSaved((list) => already ? list.filter((item) => item !== id) : [...list, id])
    setNotice(already ? 'Removed from your reading list.' : 'Saved for this visit. No account needed; reloading clears your list.')
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.current?.focus() }
      if (e.key === 'Escape') { setQuery(''); search.current?.blur() }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])
  useEffect(() => {
    if (!notice) return
    const timeout = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timeout)
  }, [notice])
  const filtered = claims.filter((claim) => {
    const matchesQuery = `${claim.name} ${claim.from} ${claim.to}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (league === 'All leagues' || claim.league === league) &&
      (status === 'All signals' || claim.status === status) && (tier === 'All tiers' || claim.tier === Number(tier)) &&
      (tab !== 'Reading list' || saved.includes(claim.id))
  }).sort((a, b) => sort === 'Biggest movement' ? Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0) : sort === 'Player A–Z' ? a.name.localeCompare(b.name) : (demo ? 0 : Number(['Confirmed', 'Denied'].includes(a.status)) - Number(['Confirmed', 'Denied'].includes(b.status))) || (b.probability ?? 0) - (a.probability ?? 0))

  return <div className="g-app">
    <nav className="g-navigation" aria-label="Main navigation">
      <div className="g-nav-tabs">
        {tabs.map((item) => (
          <button
            key={item.name}
            className={tab === item.name ? 'active' : ''}
            onClick={() => setTab(item.name)}
            aria-label={`${item.name}${item.name === 'Reading list' ? ` ${saved.length}` : ''}`}
            aria-current={tab === item.name ? 'page' : undefined}
          >
            <Icon name={item.icon} size={17} />
            <span className="g-nav-label" aria-hidden="true">{item.name}</span>
            <span className="g-nav-short-label" aria-hidden="true">{item.shortName}</span>
            {item.name === 'Reading list' && <span className="g-nav-count" aria-hidden="true">{saved.length}</span>}
          </button>
        ))}
      </div>
      <button className="g-window" onClick={() => setMethodology(true)}><span className="g-status-dot" />SUMMER WINDOW <span className="g-window-year">{demo ? '2025' : heuristic ? 'LIVE' : 'READ-ONLY'}</span><Icon name="down" size={13} /></button>
    </nav>
    <div className="g-ticker"><span className="g-ticker-label"><Icon name="activity" size={14} />{demo ? 'SIGNAL PREVIEW' : 'LATEST EVIDENCE'}</span><div className="g-ticker-track">{tickerClaims.map(({ claim, age }) => <button key={claim.id} onClick={() => setSelected(claim)}><span className="g-muted">{age}</span><strong>{claim.name}</strong><span className="g-ticker-route">→ {claim.to}</span><span className="g-tier">{claim.tier ? `T${claim.tier}` : '—'}</span><DeltaChip value={claim.delta} /></button>)}</div><span className="g-ticker-end">{demo ? 'ILLUSTRATIVE' : heuristic ? 'LIVE' : 'READ-ONLY'}</span></div>
    <div className="g-workspace">
      <section className="g-page-heading"><div><div className="g-eyebrow"><span className="g-kicker-rule" aria-hidden="true" /> INDEPENDENT. EVIDENCE FIRST.</div><h1>The transfer intelligence desk<span>.</span></h1><p>An independent view of the mercato. Follow the evidence, not the noise.</p></div><button className="g-button" onClick={() => setDrawer(true)}><Icon name="star" size={15} />Reading list<span className="g-button-count">{saved.length}</span></button></section>
      <div className={`g-connection-notice ${demo ? 'is-illustrative' : 'is-connected'}`}><span><span className="g-amber-dot" />{demo ? 'ILLUSTRATIVE EDITION' : 'CONNECTED EDITION'}</span><p>{demo ? 'All stories, forecasts and scores below are examples, not live reporting.' : workspace.reason}</p><button title={workspace.reason} onClick={() => setMethodology(true)}>Data status <Icon name="external" size={13} /></button></div>
      <section className="g-metrics" aria-label="Transfer intelligence overview">
        {[{ label: 'ACTIVE SIGNALS', value: demo ? '1,284' : String(metrics?.activeSignals ?? claims.length), change: demo ? '+36 today' : metrics ? `+${metrics.newToday} today · ${claims.length} tracked` : 'Public records', icon: 'activity', bars: [12, 20, 16, 27, 21, 30, 26, 37, 31, 40] },
          { label: 'HIGH-CONVICTION', value: demo ? '24' : metrics ? String(metrics.highConviction) : '—', change: demo ? 'Above 70% likelihood' : metrics ? 'Open stories at 70%+ (model estimate)' : 'Model verification pending', icon: 'shield', bars: [10, 15, 20, 14, 23, 28, 20, 30, 26, 35] },
          { label: 'SOURCES MONITORED', value: demo ? '186' : String(metrics?.sourcesMonitored ?? new Set(claims.flatMap((c) => c.evidence.map((e) => e.source))).size), change: demo ? 'Across 12 leagues' : metrics ? `${metrics.headlinesThisWeek.toLocaleString('en-GB')} headlines this week` : 'In loaded evidence', icon: 'branch', bars: [13, 17, 16, 23, 22, 29, 27, 34, 32, 38] },
          { label: 'MODEL BRIER SCORE', value: demo ? '0.142' : ledger?.brierScore != null ? ledger.brierScore.toFixed(3) : '—', change: demo ? '↓ 0.018 vs. last window' : ledger?.scored ? `${ledger.scored} resolved calls · heuristic model` : 'No verified score available', icon: 'chart', bars: [40, 35, 37, 28, 30, 24, 27, 18, 20, 14] },
        ].map((metric) => <article className="g-metric" key={metric.label}><div><span className="g-eyebrow">{metric.label}</span><Icon name={metric.icon} size={16} /></div><div className="g-metric-bottom"><div><strong>{metric.value}</strong><p className={metric.label === 'MODEL BRIER SCORE' ? 'g-green' : ''}>{metric.change}</p></div>{demo && <div className="g-mini-bars" aria-hidden="true">{metric.bars.map((n, i) => <i key={i} style={{ height: n }} />)}</div>}</div></article>)}
      </section>
      <div className="g-tools"><div className="g-search"><Icon name="search" size={17} /><input ref={search} aria-label="Search players, clubs or claims" value={query} onChange={(e) => { setQuery(e.target.value); if (tab !== 'Reading list') setTab('Intelligence') }} placeholder="Search players, clubs or claims…" /><kbd>⌘ K</kbd>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><Icon name="close" size={14} /></button>}</div><div className="g-filter-controls"><label><span className="g-sr-only">League</span><select value={league} data-active={league !== 'All leagues'} onChange={(e) => setLeague(e.target.value)}>{['All leagues', ...leagueOptions].map((l) => <option key={l}>{l}</option>)}</select></label><label><span className="g-sr-only">Signal status</span><select value={status} data-active={status !== 'All signals'} onChange={(e) => setStatus(e.target.value)}>{['All signals', 'Hot', 'Smoke', 'Confirmed', 'Denied'].map((s) => <option key={s}>{s}</option>)}</select></label><label><span className="g-sr-only">Source tier</span><select value={tier} data-active={tier !== 'All tiers'} onChange={(e) => setTier(e.target.value)}><option>All tiers</option>{[1, 2, 3].map((t) => <option key={t} value={t}>Tier {t}</option>)}</select></label>{(league !== 'All leagues' || status !== 'All signals' || tier !== 'All tiers') && <button className="g-icon-button" aria-label="Reset filters" onClick={() => { setLeague('All leagues'); setStatus('All signals'); setTier('All tiers') }}><Icon name="close" size={16} /></button>}</div><span className="g-tool-caption"><Icon name="clock" size={14} />{demo ? 'Sample window · Jun 2025' : workspace.generatedAt ? `Updated ${new Date(workspace.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC` : 'Refreshes every 30s on request'}</span></div>

      {(tab === 'Intelligence' || tab === 'Reading list') && <>
        {tab === 'Intelligence' && hero && <div className="g-hero-grid">
          <section className="g-panel g-hero">
            <div className="g-hero-top"><span className="g-eyebrow"><Icon name="activity" size={16} /> RUMOUR OF THE DAY</span><span className="g-claim-id">CLAIM / {hero.id.replace('demo-', '').padStart(4, '0')}</span><button className={`g-icon-button ${saved.includes(hero.id) ? 'g-is-watched' : ''}`} onClick={() => toggleSave(hero.id)} aria-label={`${saved.includes(hero.id) ? 'Unsave' : 'Save'} ${hero.name}`} aria-pressed={saved.includes(hero.id)}><Icon name="star" size={18} /></button></div>
            <div className="g-hero-main">
              <div className="g-hero-story">
                <div className="g-hero-tags"><StatusBadge status={hero.status} /><span className="g-muted">{hero.position} <span className="g-divider">/</span> {hero.age} <span className="g-divider">/</span> {hero.nationality}</span></div>
                <h2>{hero.name}</h2>
                <p className="g-hero-headline">{hero.headline}</p>
                <div className="g-transfer-route">
                  <div className="g-route-club"><span className="g-club-code" aria-hidden="true">{hero.from.slice(0, 3).toUpperCase()}</span><span><small>CURRENT CLUB</small><strong>{hero.from}</strong></span></div>
                  <span className="g-route-arrow"><Icon name="arrow" size={18} /></span>
                  <div className="g-route-club"><span className="g-club-code destination" aria-hidden="true">{hero.to.slice(0, 3).toUpperCase()}</span><span><small>DESTINATION</small><strong>{hero.to}</strong></span></div>
                </div>
                <div className="g-hero-delta"><DeltaChip value={hero.delta} /><span>{demo ? 'since tier-1 briefing' : heuristic ? (hero.delta !== null ? 'in the last 24 hours' : 'resolved story') : 'Awaiting a verified forecast'}</span></div>
              </div>
              <div className="g-hero-forecast">
                <span className="g-forecast-caption">{demo ? 'ILLUSTRATIVE FORECAST' : heuristic ? 'MODEL ESTIMATE · UNCALIBRATED' : 'CALIBRATED FORECAST'}</span>
                <ProbabilityMeter value={hero.probability} range={demo ? [66, 82] : undefined} />
                <div className="g-corridor-label"><span />{demo ? 'Illustrative range: 66–82%' : heuristic ? (hero.probability !== null ? 'Heuristic likelihood, not a calibrated forecast' : 'No estimate for this record yet') : 'Forecast pending 200 resolved data points'}</div>
              </div>
            </div>
            <div className="g-route-matrix">{[{ label: 'ESTIMATED FEE', value: hero.fee }, { label: 'CONTRACT EXPIRES', value: hero.contract }, { label: 'REPRESENTATION', value: demo ? 'HCM Sports Management' : 'Not disclosed' }, { label: 'REPORTED WAGES', value: demo ? '€200k / week' : 'Not disclosed' }].map((item) => <div key={item.label}><span className="g-eyebrow">{item.label}</span><strong>{item.value}</strong></div>)}</div>
            <div className="g-hero-bottom"><span><Icon name="branch" size={14} />{hero.evidence.length} evidence items <span className="g-divider">·</span> {new Set(hero.evidence.map((e) => e.parentId || e.id)).size} origin clusters</span><button className="g-button g-button-primary" onClick={() => setSelected(hero)}>Open claim dossier <Icon name="arrow" size={16} /></button></div>
          </section>
          <aside className="g-panel g-watchlist">
            <PanelTitle icon="book" title="The watchdesk" right={<span className="g-tier">IN FOCUS</span>} />
            <StoryList stories={claims.slice(0, 3)} onOpen={setSelected} />
            <div className="g-editorial-note">
              <span className="g-eyebrow">A NOTE FROM THE DESK</span>
              <h3>Follow the story.<br />Question the source.</h3>
              <p>Gallia brings the reporting and its paper trail into one place. No sign-up. No noise.</p>
              <button className="g-green-link" onClick={() => setMethodology(true)}>How we assess a claim <Icon name="arrow" size={15} /></button>
            </div>
          </aside>
        </div>}
        <div className="g-secondary-grid">
          <section className="g-panel g-feed" id="signals"><PanelTitle icon="activity" title={tab === 'Reading list' ? 'Your saved stories' : 'On the radar'} right={<span className="g-count-label">{filtered.length} SIGNALS</span>} /><div className="g-feed-toolbar"><div className="g-feed-tabs"><button className={status === 'All signals' ? 'active' : ''} aria-pressed={status === 'All signals'} onClick={() => setStatus('All signals')}>All signals</button><button className={status === 'Hot' ? 'active' : ''} aria-pressed={status === 'Hot'} onClick={() => setStatus('Hot')}>High conviction <span>{claims.filter((c) => c.status === 'Hot').length}</span></button><button className={status === 'Confirmed' ? 'active' : ''} aria-pressed={status === 'Confirmed'} onClick={() => setStatus('Confirmed')}>Confirmed</button></div><label className="g-sort"><span className="g-sr-only">Sort signals</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Signal strength</option><option>Biggest movement</option><option>Player A–Z</option></select></label></div>
            <div className="g-feed-columns"><span>PLAYER / TRANSFER ROUTE</span><span>60D TREND</span><span>LIKELIHOOD</span><span>24H Δ</span><span /></div>
            <div className="g-feed-list">
              {filtered.slice(0, feedLimit).map((claim) => (
                <article className="g-feed-row" key={claim.id}>
                  <button className="g-feed-player" aria-label={`Open dossier for ${claim.name}`} onClick={() => setSelected(claim)}>
                    <span className={`g-player-monogram ${claim.status === 'Confirmed' ? 'confirmed' : ''}`} aria-hidden="true">{claim.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}</span>
                    <span><span className="g-player-name">{claim.name}<span className="g-position">{claim.position}</span></span><span className="g-feed-route">{claim.from} <span>→</span> {claim.to}</span></span>
                  </button>
                  <div className="g-row-trend"><Sparkline values={claim.trend} negative={(claim.delta ?? 0) < 0} /></div>
                  <div className={`g-row-prob ${claim.status.toLowerCase()}`}>
                    <strong>{claim.probability ?? '—'}{claim.probability !== null && <small>%</small>}</strong>
                    {claim.probability !== null && <span className="g-probability-track" aria-hidden="true"><i style={{ width: `${claim.probability}%` }} /></span>}
                    <span className={`g-small-status ${claim.status.toLowerCase()}`}>{claim.status.toUpperCase()}</span>
                  </div>
                  <DeltaChip value={claim.delta} />
                  <button className={`g-icon-button ${saved.includes(claim.id) ? 'g-is-watched' : ''}`} onClick={() => toggleSave(claim.id)} aria-label={`${saved.includes(claim.id) ? 'Unsave' : 'Save'} ${claim.name}`} aria-pressed={saved.includes(claim.id)}><Icon name="star" size={16} /></button>
                </article>
              ))}
            </div>
            {filtered.length > feedLimit && <button className="g-provenance-all" onClick={() => setFeedLimit((n) => n + 24)}>Show {Math.min(24, filtered.length - feedLimit)} more of {filtered.length - feedLimit} remaining <Icon name="down" size={16} /></button>}
            {!filtered.length && <div className="g-empty"><Icon name={tab === 'Reading list' && !saved.length ? 'star' : 'search'} size={24} /><h3>{tab === 'Reading list' && !saved.length ? 'Nothing saved. Yet.' : 'No active smoke in this sector.'}</h3><p>{tab === 'Reading list' && !saved.length ? 'Star any story to save it for this visit. No account needed.' : 'Try another player or broaden your filters.'}</p><button className="g-button" onClick={() => { setQuery(''); setLeague('All leagues'); setStatus('All signals'); setTier('All tiers'); if (tab === 'Reading list' && !saved.length) setTab('Intelligence') }}>{tab === 'Reading list' && !saved.length ? 'Browse latest stories' : 'Clear search & filters'}</button></div>}
            <div className="g-panel-foot"><span>Evidence over engagement. Always.</span><span>{demo ? 'EXAMPLE DATASET / 06' : `${claims.length} LOADED RECORDS`}</span></div>
          </section>
          <aside className="g-panel g-provenance"><PanelTitle icon="branch" title="Follow the evidence" right={<span className="g-tier">PROVENANCE</span>} />{hero ? <><div className="g-provenance-intro"><span className="g-eyebrow">CANONICAL CLAIM</span><h3>{hero.name} → {hero.to}</h3><p>{demo ? 'Personal terms agreed on a five-year contract.' : hero.headline}</p></div><EvidenceBalance evidence={hero.evidence} /><div className="g-evidence-tree">{hero.evidence.slice(0, 4).map((e) => <EvidenceNode evidence={e} key={e.id} />)}{!hero.evidence.length && <p className="g-empty">No published evidence available.</p>}</div><button className="g-provenance-all" onClick={() => setSelected(hero)}>Explore full evidence tree <Icon name="arrow" size={16} /></button></> : <p className="g-empty">No claims available.</p>}</aside>
        </div>
      </>}
      {tab === 'Sources & provenance' && <section className="g-panel g-source-view"><PanelTitle icon="branch" title="The provenance engine" right={<span className="g-tier">ORIGINS, NOT ECHOES</span>} /><div className="g-source-intro"><h2>Every claim has a paper trail.</h2><p>Independent reporting is separated from syndication. Open a source to inspect the original excerpt and lineage.</p></div>{claims.filter((c) => c.evidence.length).slice(0, sourceLimit).map((claim) => <div className="g-source-claim" key={claim.id}><h3>{claim.name} <span className="g-muted">→ {claim.to}</span></h3>{claim.evidence.map((e) => <EvidenceNode key={e.id} evidence={e} />)}</div>)}{claims.filter((c) => c.evidence.length).length > sourceLimit && <button className="g-provenance-all" onClick={() => setSourceLimit((n) => n + 24)}>Show more paper trails <Icon name="down" size={16} /></button>}{!claims.some((c) => c.evidence.length) && <p className="g-empty">No published evidence is available in this edition.</p>}</section>}
      {(tab === 'Calibration' || tab === 'Intelligence') && <section className="g-panel g-calibration" id="calibration"><PanelTitle icon="chart" title="The accountability ledger" right={<button className="g-text-button" onClick={() => setMethodology(true)}>Our methodology <Icon name="external" size={14} /></button>} /><div className="g-calibration-intro"><div><h3>We keep score. Publicly.</h3><p>Every resolved call. The forecast we made. What actually happened.</p></div><div className="g-calibration-score"><span className="g-eyebrow">{demo ? 'EXAMPLE BRIER SCORE' : heuristic ? 'BRIER SCORE · HEURISTIC MODEL' : 'BRIER SCORE'}</span><strong>{demo ? '0.142' : ledger?.brierScore != null ? ledger.brierScore.toFixed(3) : '—'}<small> / lower is better</small></strong></div></div><div className="g-table-scroll"><table><caption className="g-sr-only">{demo ? 'Illustrative calibration records, not actual model performance' : 'Resolved calls scored against the last pre-outcome heuristic likelihood'}</caption><thead><tr><th>RESOLVED CLAIM</th><th>{ledger ? 'FINAL ESTIMATE' : 'PEAK FORECAST'}</th><th>60D TREND</th><th>WINDOW</th><th>OUTCOME</th><th>BRIER ERROR</th><th>PAYOUT Δ</th></tr></thead><tbody>{demo && [
        { player: 'Kylian Mbappé', route: 'PSG → Real Madrid', peak: '96%', trend: [40, 46, 44, 60, 58, 75, 73, 85, 90, 96], outcome: 'Completed', brier: '0.0016', payout: '+0.04', window: 'SUMMER ’24' },
        { player: 'João Neves', route: 'Benfica → PSG', peak: '87%', trend: [25, 30, 27, 45, 42, 60, 63, 76, 80, 87], outcome: 'Completed', brier: '0.0169', payout: '+0.13', window: 'SUMMER ’24' },
        { player: 'Martín Zubimendi', route: 'Real Sociedad → Liverpool', peak: '68%', trend: [30, 38, 34, 54, 63, 68, 60, 35, 24, 10], outcome: 'Failed', brier: '0.4624', payout: '−0.68', window: 'SUMMER ’24' },
      ].map((row) => <tr key={row.player}><td><strong>{row.player}</strong><span>{row.route}</span></td><td className="g-mono">{row.peak}</td><td><Sparkline values={row.trend} negative={row.outcome === 'Failed'} /></td><td className="g-window-cell">{row.window}</td><td><span className={`g-outcome ${row.outcome === 'Failed' ? 'failed' : ''}`}><Icon name={row.outcome === 'Failed' ? 'close' : 'check'} size={13} />{row.outcome}</span></td><td className="g-mono">{row.brier}</td><td className={`g-mono ${row.outcome === 'Failed' ? 'g-red' : 'g-green'}`}>{row.payout}</td></tr>)}{!demo && ledger?.rows.slice(0, ledgerLimit).map((row) => <tr key={row.id}><td><strong>{row.player}</strong><span>{row.route}</span></td><td className="g-mono" title={`Peak ${row.peak}%`}>{row.scored}%</td><td><Sparkline values={row.trend} negative={row.outcome === 'Failed'} /></td><td className="g-window-cell">{row.window}</td><td><span className={`g-outcome ${row.outcome === 'Failed' ? 'failed' : ''}`}><Icon name={row.outcome === 'Failed' ? 'close' : 'check'} size={13} />{row.outcome}</span></td><td className="g-mono">{row.brier.toFixed(4)}</td><td className={`g-mono ${row.payout < 0 ? 'g-red' : 'g-green'}`}>{row.payout > 0 ? '+' : row.payout < 0 ? '−' : ''}{Math.abs(row.payout).toFixed(2)}</td></tr>)}</tbody></table>{!demo && ledger && ledger.rows.length > ledgerLimit && <button className="g-provenance-all" onClick={() => setLedgerLimit(ledger.rows.length)}>Show all {ledger.rows.length} resolved calls <Icon name="down" size={16} /></button>}{!demo && !ledger?.rows.length && <p className="g-empty">Forecast pending 200 resolved data points. No verified calibration records are exposed by this connection.</p>}</div><div className="g-panel-foot"><span><Icon name="shield" size={14} />{demo ? 'Illustrative records · not an audited performance claim' : ledger?.rows.length ? `Every resolved call, scored on the last estimate before the outcome${ledger.excluded ? ` · ${ledger.excluded} without pre-outcome history left out` : ''}` : 'No synthetic scores presented as calibrated forecasts'}</span><button className="g-text-button" onClick={() => setMethodology(true)}>How we measure <Icon name="arrow" size={14} /></button></div></section>}
      <section className="g-about" id="about-gallia" aria-labelledby="g-about-title">
        <div><span className="g-eyebrow">ABOUT GALLIA</span><h2 id="g-about-title">Independent by design.</h2><span className="g-about-signature">MILANO HERITAGE. AN OPEN RECORD.</span></div>
        <div><p>Gallia is an independently run football transfer intelligence website. A single editorial desk brings the reporting, source evidence and forecast record together—so readers can judge the story for themselves.</p><p>Read without an account or a software subscription. Just the story, its paper trail, and a commitment to showing our working.</p><button className="g-green-link" onClick={() => setMethodology(true)}>Read our methodology <Icon name="arrow" size={16} /></button></div>
      </section>
      <footer className="g-footer"><div><strong>GALLIA</strong><span>Born in the lobby. Built for the signal.</span></div><div><span className="g-status-dot" />{demo ? 'DEMO EDITION' : 'PUBLIC RECORDS'}<span className="g-divider">/</span><button onClick={() => setMethodology(true)}>Methodology & data</button><span className="g-divider">/</span><span>FORECASTS, NOT CERTAINTIES</span></div></footer>
    </div>
    {selected && (
      <Modal title={`CLAIM DOSSIER / ${selected.id}`} variant="dossier" onClose={() => setSelected(null)}>
        <div className="g-dossier-heading">
          <StatusBadge status={selected.status} /><h2>{selected.name}</h2>
          <p>{selected.from} → {selected.to}</p><p className="g-muted">{selected.headline}</p>
          {demo && <div className="g-dossier-warning">Illustrative dossier. Source attributions, excerpts and probabilities are sample content, not live reporting.</div>}
        </div>
        <div className="g-dossier-stats">
          <div><span className="g-eyebrow">{heuristic ? 'MODEL ESTIMATE' : 'LIKELIHOOD'}</span><strong>{selected.probability !== null ? `${selected.probability}%` : 'Pending'}</strong></div>
          <div><span className="g-eyebrow">ESTIMATED FEE</span><strong>{selected.fee}</strong></div>
          <div><span className="g-eyebrow">EVIDENCE ITEMS</span><strong>{selected.evidence.length}</strong></div>
          <button className="g-button" aria-pressed={saved.includes(selected.id)} onClick={() => toggleSave(selected.id)}><Icon name="star" size={16} />{saved.includes(selected.id) ? 'Saved for this visit' : 'Save for later'}</button>
        </div>
        <section className="g-dossier-section">
          <h3>Probability evolution <span className="g-tier">60-DAY WINDOW</span></h3>
          <Sparkline values={selected.trend} large />
          {selected.trend.length > 1 && <div className="g-chart-axis"><span>DAY −60</span><span>DAY −30</span><span>LATEST</span></div>}
        </section>
        <section className="g-dossier-section">
          <h3>Raw lineage & article excerpts</h3>
          <p className="g-muted">Original signals, supporting reports and contradictions. Expand each node to inspect its excerpt.</p>
          <EvidenceBalance evidence={selected.evidence} />
          <div className="g-evidence-tree">{selected.evidence.map((e) => <EvidenceNode key={e.id} evidence={e} />)}</div>
          {!selected.evidence.length && <div className="g-empty">No raw excerpts are available for this claim. We don’t invent the missing paper trail.</div>}
          <p className="g-extraction-note"><Icon name="book" size={15} />{demo ? 'Crawl4AI extraction preview · no live crawl has been performed.' : heuristic ? 'Headlines and links from monitored feeds. Article text is not republished.' : 'Stored excerpts are shown as received. Extraction provider is not verified.'}</p>
        </section>
      </Modal>
    )}
    {drawer && (
      <Modal title="YOUR READING LIST" variant="drawer" onClose={() => setDrawer(false)}>
        <div className="g-drawer-heading"><h2>A few stories for later.</h2><p>Saved for this visit. No sign-in required.</p></div>
        <StoryList stories={claims.filter((claim) => saved.includes(claim.id))} onOpen={setSelected} onRemove={toggleSave} />
        <div className="g-session-note"><Icon name="book" size={18} /><p>This is a temporary reading list, not an account. Reloading or closing this page clears it. Nothing is saved to a reader profile.</p></div>
      </Modal>
    )}
    {methodology && (
      <Modal title="METHODOLOGY & DATA STATUS" onClose={() => setMethodology(false)}>
        <div className="g-drawer-heading"><h2>Trust is a paper trail.</h2><p>We show what we know. And what we don’t.</p></div>
        <div className="g-methodology">
          <h3>An independent publication</h3>
          <p>Gallia is a public football transfer intelligence website, published and maintained by one editor. Readers can explore stories, evidence and the forecast record without signing up. It is not a software subscription platform.</p>
          <h3>Connection status</h3>
          <p>{workspace.reason}. {demo ? 'The public Supabase key is linked, but table reads are not authorized or are unavailable. No database password is required to view this demo, and permissions have not been changed.' : heuristic ? 'Stories, history and evidence are read live from the Gallia desk’s own database.' : 'Records are read using the connected Supabase public role and its existing access policies.'}</p>
          {heuristic ? <>
          <h3>Model estimates, labelled as such</h3>
          <p>Each open story carries a likelihood from Gallia’s scoring model: source reliability, how many independent outlets report it, the fee against market value, contract length and squad need. It is a heuristic estimate, not a calibrated probability, and is labelled that way everywhere it appears. The calibrated forecasting pipeline stays switched off until it has 200 real resolved outcomes behind a verified model.</p>
          <h3>Keeping score on ourselves</h3>
          <p>The ledger scores every resolved story on the last estimate published before the outcome was known, never the outcome itself. Source tiers are derived from each source’s track record unless an editor has set one.</p>
        </> : <>
          <h3>Forecasts are earned, not invented</h3>
          <p>Real claims do not receive an inferred probability. The imported forecasting pipeline requires real resolved outcomes and a verified model before publishing calibrated predictions. This illustrative edition’s figures do not satisfy that requirement.</p>
        </>}
          <h3>The Brier score</h3>
          <p>Mean squared error between a probability and a binary outcome: (p − y)². Zero is perfect; lower is better. A 96% forecast that completes has an error of 0.0016. The ledger’s payout delta is the illustrative outcome residual (y − p), not a monetary return.</p>
          <h3>Evidence is not a popularity contest</h3>
          <p>Five syndicated stories from one report are one origin, not five independent confirmations. Supporting, contradicting and contextual evidence remain visible together.</p>
          <h3>About this edition</h3>
          <p>{demo ? 'The summer 2025 stories are illustrative. Live ingestion and verified forecast publication are not connected to this edition.' : 'Stories come from live feed ingestion. Verified, calibrated forecast publication is not yet switched on.'} The reading list lasts for this visit only and requires no account.</p>
        </div>
      </Modal>
    )}
    <div className={`g-toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice && <><Icon name="check" size={17} />{notice}</>}</div>
  </div>
}
