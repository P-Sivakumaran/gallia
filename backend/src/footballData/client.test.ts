import { describe, it, expect } from 'vitest'
import { DailyBudgetSpent, QuotaReserveReached, TheStatsApiClient, dailyAllowance, type RequestRecord } from './client.js'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 26, 12)

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
}

function client(fetcher: (url: string) => Promise<Response>, state = { spentToday: 0, quotaRemaining: null as number | null, quotaResetAt: null as Date | null }) {
  const records: RequestRecord[] = []
  const sleeps: number[] = []
  let now = NOW
  const c = new TheStatsApiClient({
    apiKey: 'test-key',
    fetcher: (url) => fetcher(url),
    sleep: async (ms) => { sleeps.push(ms); now += ms },
    now: () => now,
    perMinute: 60,
    reserve: 20_000,
    state,
    record: async (r) => { records.push(r) },
  })
  return { c, records, sleeps }
}

describe('dailyAllowance', () => {
  it('spreads what is left above the reserve over the days left', () => {
    // 50,000 left, 20,000 reserve, 10 days → 3,000 a day
    expect(dailyAllowance(50_000, 20_000, new Date(NOW + 10 * DAY), NOW, 0)).toBe(3_000)
    // 500 already spent today: share is computed on the start-of-day figure
    expect(dailyAllowance(49_500, 20_000, new Date(NOW + 10 * DAY), NOW, 500)).toBe(2_500)
  })

  it('is zero at or below the reserve', () => {
    expect(dailyAllowance(20_000, 20_000, new Date(NOW + 5 * DAY), NOW, 0)).toBe(0)
  })
})

describe('TheStatsApiClient', () => {
  it('records quota headers and never the key', async () => {
    const { c, records } = client(async () => response(200, { data: [] }, { 'x-monthly-quota-remaining': '99000', 'x-monthly-quota-reset': String((NOW + 20 * DAY) / 1000) }))
    await c.get('/football/competitions', 'competitions')
    expect(records[0]).toMatchObject({ kind: 'competitions', status: 200, quotaRemaining: 99_000 })
    expect(JSON.stringify(records)).not.toContain('test-key')
  })

  it('stops at the reserve before calling', async () => {
    let calls = 0
    const { c } = client(async () => { calls++; return response(200, {}) }, { spentToday: 0, quotaRemaining: 20_000, quotaResetAt: new Date(NOW + 5 * DAY) })
    await expect(c.get('/x', 'x')).rejects.toBeInstanceOf(QuotaReserveReached)
    expect(calls).toBe(0)
  })

  it("stops when today's allowance is used", async () => {
    // 21,000 left over 10 days → 100/day; 100 already spent
    const { c } = client(async () => response(200, {}), { spentToday: 100, quotaRemaining: 20_900, quotaResetAt: new Date(NOW + 10 * DAY) })
    await expect(c.get('/x', 'x')).rejects.toBeInstanceOf(DailyBudgetSpent)
  })

  it('spaces requests at the per-minute cap', async () => {
    const { c, sleeps } = client(async () => response(200, { data: [] }))
    await c.get('/a', 'a')
    await c.get('/b', 'b')
    expect(sleeps).toContain(1_000) // 60/min → 1 s apart
  })

  it('waits Retry-After on 429, halves its rate, then succeeds', async () => {
    let n = 0
    const { c, sleeps } = client(async () => (n++ === 0 ? response(429, {}, { 'retry-after': '7' }) : response(200, { data: [1] })))
    const body = await c.get<{ data: number[] }>('/x', 'x')
    expect(body.data).toEqual([1])
    expect(sleeps).toContain(7_000)
    expect(c.stats.rateLimited).toBe(1)
    await c.get('/y', 'y')
    expect(sleeps).toContain(2_000) // the next request waits the doubled interval (was 1 s)
  })

  it('retries a timeout without counting it against the quota', async () => {
    let n = 0
    const { c, records } = client(async () => {
      if (n++ === 0) throw Object.assign(new Error('timed out'), { name: 'TimeoutError' })
      return response(200, { data: [2] })
    })
    expect((await c.get<{ data: number[] }>('/x', 'x')).data).toEqual([2])
    expect(records).toHaveLength(1)
  })

  it('follows pagination', async () => {
    const { c } = client(async (url) => {
      const page = Number(new URL(url).searchParams.get('page'))
      return response(200, { data: [page], meta: { total_pages: 3 } })
    })
    expect(await c.getAll<number>('/football/teams?competition_id=c', 'teams')).toEqual([1, 2, 3])
  })
})
