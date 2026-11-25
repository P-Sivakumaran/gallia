/**
 * One-off audit for Phase 1 step 5 of docs/gallia-dev-plan.md.
 *
 * Before PR #12, the window-close job marked every unconfirmed rumour FAILED,
 * including moves the club sync could not see. This finds those rows and, with
 * --apply, reopens them for owner review:
 *
 *   FAILED, terminal history row written after the window's grace end, and no
 *   linked article with failure wording  ->  back to its last open status and
 *   likelihood. The old FAILED history row stays as a record.
 *
 * Rows resolved before the deadline, or with failure wording, are left alone
 * and listed. Every affected source's hit/miss counts are recounted.
 *
 *   npx tsx src/scripts/auditWindowFailures.ts           # dry run (default)
 *   npx tsx src/scripts/auditWindowFailures.ts --apply   # take a pg_dump first
 */
import { PrismaClient, RumourStatus } from '@prisma/client'
import { detectOutcome, recountSourceOutcomes } from '../ingestion/outcomeDetector.js'
import { windowGraceEnd } from '../forecasting/windowCutoff.js'
import { preResolutionHistory, type HistoryRow } from '../gallia/workspace.js'

const TERMINAL: RumourStatus[] = [RumourStatus.COMPLETED, RumourStatus.FAILED, RumourStatus.DENIED]

interface Row {
  id: number
  status: RumourStatus
  window: string
  rumourDate: Date
  sourceId: number
  history: HistoryRow[]
}

export type AuditClass = 'window-close-unconfirmed' | 'failure-wording' | 'before-deadline' | 'no-terminal-row'

export function classifyFailed(row: Row, hasFailureWording: boolean): AuditClass {
  const sorted = [...row.history].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
  const terminal = sorted.find((h) => TERMINAL.includes(h.status))
  if (!terminal) return 'no-terminal-row'
  if (hasFailureWording) return 'failure-wording'
  const graceEnd = windowGraceEnd(row)
  if (graceEnd && terminal.recordedAt.getTime() > graceEnd.getTime()) return 'window-close-unconfirmed'
  return 'before-deadline'
}

function ledger(rows: Row[]): { scored: number; brier: number | null } {
  const errors: number[] = []
  for (const r of rows) {
    if (!TERMINAL.includes(r.status)) continue
    const deadline = windowGraceEnd(r)
    const pre = preResolutionHistory(r.history).filter((h) => !deadline || h.recordedAt.getTime() <= deadline.getTime())
    if (!pre.length) continue
    const p = pre[pre.length - 1].computedLikelihood / 100
    const y = r.status === RumourStatus.COMPLETED ? 1 : 0
    errors.push((p - y) ** 2)
  }
  return {
    scored: errors.length,
    brier: errors.length ? errors.reduce((a, b) => a + b, 0) / errors.length : null,
  }
}

async function load(prisma: PrismaClient): Promise<Row[]> {
  return prisma.rumour.findMany({
    select: {
      id: true, status: true, window: true, rumourDate: true, sourceId: true,
      history: { select: { computedLikelihood: true, status: true, recordedAt: true } },
    },
  }) as Promise<Row[]>
}

async function main() {
  const apply = process.argv.includes('--apply')
  const prisma = new PrismaClient()
  try {
    const rows = await load(prisma)
    const before = ledger(rows)
    const failed = rows.filter((r) => r.status === RumourStatus.FAILED)

    const signals = await prisma.rawSignal.findMany({
      where: { rumourId: { in: failed.map((r) => r.id) } },
      select: { rumourId: true, headline: true, rawText: true },
    })
    const worded = new Set(
      signals.filter((s) => detectOutcome(`${s.headline}\n${s.rawText}`) === 'FAILED').map((s) => s.rumourId),
    )

    const byClass = new Map<AuditClass, Row[]>()
    for (const r of failed) {
      const c = classifyFailed(r, worded.has(r.id))
      byClass.set(c, [...(byClass.get(c) ?? []), r])
    }
    for (const [c, list] of byClass) console.log(`${c}: ${list.length}  ids ${list.map((r) => r.id).join(',')}`)

    const reopen = byClass.get('window-close-unconfirmed') ?? []
    if (!apply) {
      console.log(`\nDry run. ${reopen.length} FAILED rows would reopen. Ledger now: ${before.scored} scored, Brier ${before.brier?.toFixed(4) ?? 'n/a'}.`)
      return
    }

    const sources = new Set<number>()
    for (const r of reopen) {
      const pre = preResolutionHistory(r.history)
      const last = pre[pre.length - 1]
      await prisma.rumour.update({
        where: { id: r.id },
        data: {
          status: last?.status ?? RumourStatus.PENDING,
          computedLikelihood: last?.computedLikelihood ?? 0,
        },
      })
      sources.add(r.sourceId)
    }
    for (const id of sources) await recountSourceOutcomes(id, prisma)

    const after = ledger(await load(prisma))
    console.log(`\nReopened ${reopen.length} rumours; recounted ${sources.size} sources.`)
    console.log(`Ledger before: ${before.scored} scored, Brier ${before.brier?.toFixed(4) ?? 'n/a'}`)
    console.log(`Ledger after:  ${after.scored} scored, Brier ${after.brier?.toFixed(4) ?? 'n/a'}`)
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1]?.endsWith('auditWindowFailures.ts')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
