'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ClaimDetail, EvidenceItemData } from '@/types'
import {
  EVIDENCE_CATEGORIES,
  type EvidenceCategory,
  allEvidenceChronological,
  categorizeEvidence,
  findRootFor,
  isRoot,
} from '@/lib/evidenceCategories'
import { CheckCircleIcon, XCircleIcon, OriginalIcon, CopyIcon, HelpCircleIcon } from './icons'
import SectionKicker from './SectionKicker'
import { clsx } from 'clsx'

interface Props {
  claim: ClaimDetail | null
  isLoading?: boolean
  error?: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function directionIcon(item: EvidenceItemData) {
  if (item.evidenceDirection === 'CONFIRMS') return <CheckCircleIcon className="h-4 w-4 text-pitch-500" />
  if (item.evidenceDirection === 'DENIES') return <XCircleIcon className="h-4 w-4 text-failed-fg" />
  if (item.evidenceDirection === 'CONTEXTUAL') return <HelpCircleIcon className="h-4 w-4 text-ink-muted" />
  return isRoot(item) ? (
    <OriginalIcon className="h-4 w-4 text-caution-fg" />
  ) : (
    <CopyIcon className="h-4 w-4 text-ink-muted" />
  )
}

function EvidenceRow({ item, claim }: { item: EvidenceItemData; claim: ClaimDetail }) {
  const root = isRoot(item) ? null : findRootFor(item, claim)
  const primary = isRoot(item)

  return (
    <li id={`evidence-${item.id}`} className="relative pl-6">
      <span
        className={clsx(
          'absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2',
          primary ? 'border-caution-fg bg-caution-fg/30' : 'border-line bg-surface-panel',
        )}
        aria-hidden
      />
      <div
        className={clsx(
          'flex items-start gap-2.5 rounded-lg border p-3',
          primary
            ? 'border-line bg-surface-raised/50'
            : 'border-line-subtle/60 bg-surface-panel/30 ml-2',
        )}
      >
        <span className="mt-0.5 flex-shrink-0">{directionIcon(item)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <a
              href={item.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                'hover:underline',
                primary ? 'text-sm font-semibold text-ink-primary' : 'text-xs font-medium text-ink-secondary',
              )}
            >
              {item.title}
            </a>
            {primary && (
              <span className="rounded-full border border-caution/40 bg-caution/10 px-1.5 py-0.5 text-label font-medium uppercase tracking-wide text-caution-fg">
                Original
              </span>
            )}
            {!primary && (
              <span className="rounded-full border border-line bg-surface-raised/60 px-1.5 py-0.5 text-label font-medium uppercase tracking-wide text-ink-muted">
                Copy
              </span>
            )}
          </div>
          <p className={clsx('mt-0.5', primary ? 'text-xs text-ink-secondary' : 'text-label text-ink-faint')}>
            {item.sourceName ?? 'Unknown source'} · {formatDate(item.publishedAt)}
          </p>
          {root && (
            <a href={`#evidence-${root.id}`} className="mt-1 inline-block text-label text-ink-faint hover:text-ink-secondary hover:underline">
              Same story as: {root.title}
            </a>
          )}
        </div>
      </div>
    </li>
  )
}

export default function EvidenceTimeline({ claim, isLoading = false, error = null }: Props) {
  const [activeFilters, setActiveFilters] = useState<Set<EvidenceCategory>>(new Set())

  const toggleFilter = (cat: EvidenceCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const items = useMemo(() => (claim ? allEvidenceChronological(claim) : []), [claim])

  const visibleItems = useMemo(() => {
    if (!claim || activeFilters.size === 0) return items
    return items.filter((item) => {
      const cats = categorizeEvidence(item, claim)
      return cats.some((c) => activeFilters.has(c))
    })
  }, [items, claim, activeFilters])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="timeline-loading">
        <div className="animate-pulse space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-surface-raised/60" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="timeline-error">
        <p className="text-sm text-ink-muted">Couldn&apos;t load the evidence timeline: {error}</p>
      </div>
    )
  }

  if (!claim || items.length === 0) {
    return (
      <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="timeline-empty">
        <p className="text-sm text-ink-muted">No evidence captured for this claim yet.</p>
        <p className="mt-3">
          <Link
            href="/rumours"
            className="text-sm font-medium text-pitch-500 hover:underline"
            data-testid="timeline-empty-rumours-cta"
          >
            Browse rumours →
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line/60 bg-card shadow-card p-5" data-testid="evidence-timeline">
      <SectionKicker>Evidence timeline</SectionKicker>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter evidence by category">
        {EVIDENCE_CATEGORIES.map(({ key, label }) => {
          const active = activeFilters.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              aria-pressed={active}
              className={clsx(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-pitch-500 bg-pitch-500/20 text-pitch-500'
                  : 'border-line bg-transparent text-ink-secondary hover:border-line-emphasis hover:text-ink-body',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {visibleItems.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No evidence matches the selected filters.</p>
      ) : (
        <ul className="mt-4 space-y-2.5 border-l border-line-subtle pl-0">
          {visibleItems.map((item) => (
            <EvidenceRow key={item.id} item={item} claim={claim} />
          ))}
        </ul>
      )}
    </div>
  )
}
