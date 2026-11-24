import type { GalliaClaim } from './gallia-types'

// Editorial fixtures only. Never mix these with connected records or model output.
export const illustrativeClaims: GalliaClaim[] = [
  {
    id: 'demo-001', name: 'Viktor Gyökeres', position: 'ST', age: '27', nationality: 'Sweden',
    from: 'Sporting CP', to: 'Arsenal', league: 'Premier League', status: 'Hot',
    probability: 74, delta: 18, tier: 1, fee: '€70–80m', contract: 'Jun 2028',
    headline: 'Arsenal advance talks for Sporting’s leading man.',
    trend: [28, 30, 27, 33, 31, 38, 37, 44, 42, 50, 48, 56, 53, 58, 56, 64, 62, 70, 68, 74],
    evidence: [
      { id: 'demo-e1', direction: 'SUPPORTS', source: 'David Ornstein', tier: 1, title: 'Club-to-club negotiations advancing', excerpt: 'Illustrative excerpt: Arsenal and Sporting are progressing in discussions over the structure of a potential deal. No agreement has been signed.', time: '12 min ago' },
      { id: 'demo-e2', direction: 'SUPPORTS', source: 'Fabrizio Romano', tier: 1, title: 'Personal terms not expected to be an obstacle', excerpt: 'Illustrative excerpt: The player is open to the move, with the two clubs still negotiating the payment structure.', time: '38 min ago' },
      { id: 'demo-e3', direction: 'CONTRADICTS', source: 'A Bola', tier: 2, title: 'Sporting hold firm on valuation', excerpt: 'Illustrative excerpt: Sporting have not accepted the current proposal and remain clear on their valuation.', time: '1 hr ago' },
      { id: 'demo-e4', direction: 'CONTEXTUAL', source: 'The Athletic', tier: 1, title: 'A centre-forward remains the summer priority', excerpt: 'Illustrative excerpt: The recruitment strategy prioritizes a forward. This is context, not independent confirmation of this transfer.', time: '2 hr ago', parentId: 'demo-e1' },
    ],
  },
  { id: 'demo-002', name: 'Florian Wirtz', position: 'CAM', age: '22', nationality: 'Germany', from: 'Bayer Leverkusen', to: 'Liverpool', league: 'Premier League', status: 'Hot', probability: 89, delta: 6, tier: 1, fee: '€125m', contract: 'Jun 2027', headline: 'Liverpool move closer to a club-record agreement.', evidence: [], trend: [24, 29, 25, 40, 38, 52, 50, 68, 73, 71, 84, 89] },
  { id: 'demo-003', name: 'Tijjani Reijnders', position: 'CM', age: '26', nationality: 'Netherlands', from: 'AC Milan', to: 'Manchester City', league: 'Premier League', status: 'Hot', probability: 82, delta: 12, tier: 1, fee: '€55m', contract: 'Jun 2030', headline: 'City and Milan discuss a midfield reshuffle.', evidence: [], trend: [35, 38, 37, 44, 48, 41, 55, 62, 58, 73, 70, 82] },
  { id: 'demo-004', name: 'Nico Williams', position: 'LW', age: '22', nationality: 'Spain', from: 'Athletic Club', to: 'Barcelona', league: 'La Liga', status: 'Smoke', probability: 46, delta: -4, tier: 2, fee: '€58m', contract: 'Jun 2027', headline: 'Barcelona interest persists; financial questions remain.', evidence: [], trend: [35, 42, 39, 45, 50, 46, 52, 49, 53, 50, 46] },
  { id: 'demo-005', name: 'Jonathan David', position: 'ST', age: '25', nationality: 'Canada', from: 'LOSC Lille', to: 'Juventus', league: 'Serie A', status: 'Hot', probability: 68, delta: 9, tier: 2, fee: 'Free agent', contract: 'Jun 2025', headline: 'Juventus explore a free-agent opportunity.', evidence: [], trend: [25, 29, 28, 40, 36, 42, 50, 48, 59, 55, 68] },
  { id: 'demo-006', name: 'Trent Alexander-Arnold', position: 'RB', age: '26', nationality: 'England', from: 'Liverpool', to: 'Real Madrid', league: 'La Liga', status: 'Confirmed', probability: 100, delta: 3, tier: 1, fee: '€10m', contract: 'Jun 2025', headline: 'A new chapter in Madrid.', evidence: [], trend: [40, 45, 53, 50, 66, 70, 82, 90, 97, 100] },
]
