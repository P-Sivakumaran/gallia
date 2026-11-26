/**
 * TheStatsAPI client for the football-data sync (docs/football-data-plan.md).
 *
 * The key is shared with Overround, so the client paces itself instead of bursting:
 * - at most `perMinute` requests a minute (default 60, half the plan's 120);
 * - stops when the monthly quota left (from x-monthly-quota-remaining) reaches `reserve`;
 * - spends at most (quota left − reserve) ÷ days left in the period on any one day, so the
 *   month ends near Gallia's share instead of hitting the wall early;
 * - on 429 waits Retry-After and halves its rate for the rest of the run.
 * Every request is reported to `record` (never the key) for the pacer and the admin spend view.
 */

export const DEFAULT_BASE_URL = 'https://api.thestatsapi.com/api'

export class QuotaReserveReached extends Error {}
export class DailyBudgetSpent extends Error {}
export class ProviderError extends Error {
  constructor(public status: number, public path: string) {
    super(`TheStatsAPI ${status} on ${path}`)
  }
}

export interface RequestRecord {
  kind: string
  path: string
  status: number
  quotaRemaining: number | null
  quotaResetAt: Date | null
  competitionId?: number | null
}

export interface PacerState {
  /** Requests Gallia already made today (from the request log), so restarts don't reset the day. */
  spentToday: number
  /** Last known quota figures, if any (from the request log). */
  quotaRemaining: number | null
  quotaResetAt: Date | null
}

export interface ClientOptions {
  apiKey: string
  fetcher?: (url: string, init: RequestInit) => Promise<Response>
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  baseUrl?: string
  perMinute?: number
  reserve?: number
  state: PacerState
  record: (r: RequestRecord) => Promise<void>
}

const DAY_MS = 86_400_000

/** How many requests today may still use: (quota left − reserve) ÷ days left, minus what today spent. */
export function dailyAllowance(quotaRemaining: number, reserve: number, resetAt: Date, nowMs: number, spentToday: number): number {
  const spendable = quotaRemaining - reserve
  if (spendable <= 0) return 0
  const daysLeft = Math.max(1, Math.ceil((resetAt.getTime() - nowMs) / DAY_MS))
  // Today's share is computed on what was left at the start of the day.
  const todayShare = Math.floor((spendable + spentToday) / daysLeft)
  return Math.max(0, todayShare - spentToday)
}

export class TheStatsApiClient {
  private readonly fetcher: NonNullable<ClientOptions['fetcher']>
  private readonly sleep: NonNullable<ClientOptions['sleep']>
  private readonly now: () => number
  private readonly baseUrl: string
  private readonly reserve: number
  private intervalMs: number
  private lastAt = 0
  private readonly state: PacerState
  readonly stats = { requests: 0, rateLimited: 0 }

  constructor(private readonly opts: ClientOptions) {
    this.fetcher = opts.fetcher ?? ((url, init) => fetch(url, init))
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
    this.now = opts.now ?? (() => Date.now())
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL
    this.reserve = opts.reserve ?? 20_000
    this.intervalMs = Math.ceil(60_000 / (opts.perMinute ?? 60))
    this.state = { ...opts.state }
  }

  /** Throws when the reserve or today's allowance would be crossed. Unknown quota (first call) is allowed. */
  checkBudget(): void {
    const { quotaRemaining, quotaResetAt, spentToday } = this.state
    if (quotaRemaining == null || quotaResetAt == null) return
    if (quotaRemaining <= this.reserve) throw new QuotaReserveReached(`quota ${quotaRemaining} at or below reserve ${this.reserve}`)
    if (dailyAllowance(quotaRemaining, this.reserve, quotaResetAt, this.now(), spentToday) <= 0) {
      throw new DailyBudgetSpent(`today's allowance is used (${spentToday} requests)`)
    }
  }

  async get<T>(path: string, kind: string, competitionId: number | null = null): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      this.checkBudget()
      const wait = this.lastAt + this.intervalMs - this.now()
      if (wait > 0) await this.sleep(wait)
      this.lastAt = this.now()

      let res: Response
      try {
        res = await this.fetcher(`${this.baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${this.opts.apiKey}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        })
      } catch (err) {
        // Timeouts and dropped connections are transient: back off and retry (no quota is used).
        const name = (err as Error).name
        if (attempt === 3 || (name !== 'TimeoutError' && name !== 'TypeError' && name !== 'AbortError')) throw err
        await this.sleep(5_000 * (attempt + 1))
        continue
      }
      this.stats.requests++
      this.state.spentToday++
      const remaining = Number(res.headers.get('x-monthly-quota-remaining'))
      const reset = Number(res.headers.get('x-monthly-quota-reset'))
      if (Number.isFinite(remaining) && res.headers.get('x-monthly-quota-remaining') != null) this.state.quotaRemaining = remaining
      if (Number.isFinite(reset) && reset > 0) this.state.quotaResetAt = new Date(reset * 1000)
      await this.opts.record({
        kind, path, status: res.status, competitionId,
        quotaRemaining: this.state.quotaRemaining, quotaResetAt: this.state.quotaResetAt,
      })

      if (res.status === 429) {
        this.stats.rateLimited++
        this.intervalMs *= 2 // halve the rate for the rest of the run
        const retryAfter = Number(res.headers.get('retry-after'))
        await this.sleep((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30) * 1000)
        continue
      }
      if (!res.ok) throw new ProviderError(res.status, path)
      return (await res.json()) as T
    }
    throw new ProviderError(429, path)
  }

  /** Every page of a paginated list endpoint. */
  async getAll<T>(path: string, kind: string, competitionId: number | null = null, perPage = 100): Promise<T[]> {
    const out: T[] = []
    const sep = path.includes('?') ? '&' : '?'
    for (let page = 1; page < 50; page++) {
      const body = await this.get<{ data: T[]; meta?: { total_pages?: number } }>(`${path}${sep}page=${page}&per_page=${perPage}`, kind, competitionId)
      out.push(...body.data)
      if (!body.meta?.total_pages || page >= body.meta.total_pages) break
    }
    return out
  }
}
