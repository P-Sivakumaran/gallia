import type { FootballCompetition } from '@/types'

export type CompetitionCountryGroup = {
  country: string
  competitions: FootballCompetition[]
}

/** Group competitions by country, sorted country then competition name. */
export function groupCompetitionsByCountry(
  competitions: FootballCompetition[],
): CompetitionCountryGroup[] {
  const byCountry = new Map<string, FootballCompetition[]>()
  for (const c of competitions) {
    const key = (c.country || 'Unknown').trim() || 'Unknown'
    const list = byCountry.get(key)
    if (list) list.push(c)
    else byCountry.set(key, [c])
  }
  return [...byCountry.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([country, comps]) => ({
      country,
      competitions: [...comps].sort((x, y) => x.name.localeCompare(y.name)),
    }))
}
