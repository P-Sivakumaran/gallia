export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'CF'
export type TransferWindow = 'SUMMER' | 'WINTER' | 'FREE_AGENT'
export type RumourStatus = 'PENDING' | 'HOT' | 'COMPLETED' | 'FAILED' | 'DENIED'
export type SourceType = 'JOURNALIST' | 'CLUB_OFFICIAL' | 'AGENT' | 'NEWS_OUTLET' | 'SOCIAL_MEDIA' | 'AGGREGATOR'

export interface Club {
  id: number
  name: string
  shortName: string | null
  league: string
  country: string
  logoUrl: string | null
}

export interface Player {
  id: number
  name: string
  age: number | null
  position: Position
  currentClub: Club | null
  contractEnd: string | null
  marketValue: number | null
  nationality: string | null
  photoUrl: string | null
}

export interface Source {
  id: number
  name: string
  type: SourceType
  reliabilityScore: number
  url: string | null
}

export interface Rumour {
  id: number
  player: Player
  fromClub: Club
  fromClubInferred: boolean
  toClub: Club
  source: Source
  reportedFeeMin: number | null
  reportedFeeMax: number | null
  currency: string
  rumourDate: string
  window: TransferWindow
  baseProbability: number
  computedLikelihood: number
  status: RumourStatus
  distinctSourceCount: number
  notes: string | null
}

export interface RumourHistoryPoint {
  computedLikelihood: number
  recordedAt: string
}

export interface EvidenceItem {
  sourceName: string
  headline: string
  link: string
  publishedAt: string
}

export interface RumourDetail extends Rumour {
  history: RumourHistoryPoint[]
  evidence: EvidenceItem[]
}

export interface ClubDetail extends Club {
  players: Player[]
  activeIn: Rumour[]
  activeOut: Rumour[]
  totalExpectedSpend: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface AdminRumour {
  id: number
  computedLikelihood: number
  status: RumourStatus
  contradicts: number | null
  rumourDate: string
  notes: string | null
  player: { name: string }
  fromClub: { name: string }
  toClub: { name: string }
  source: { name: string; reliabilityScore: number }
  evidence: EvidenceItem[]
}

export type ReviewReason = 'window-closed' | 'text-signal'

export interface ReviewTextSignal {
  outcome: 'COMPLETED' | 'FAILED'
  headline: string
  link: string
  publishedAt: string
  sourceName: string
}

/** GET /admin/rumours/awaiting-review — see docs/resolution-rules.md. */
export interface AdminReviewItem {
  id: number
  status: RumourStatus
  computedLikelihood: number
  window: string
  rumourDate: string
  notes: string | null
  player: { name: string; currentClubId: number | null }
  fromClub: { name: string }
  toClub: { name: string }
  source: { name: string }
  reasons: ReviewReason[]
  textSignals: ReviewTextSignal[]
  suggestedKnownAt: string | null
}

export type SourceLicenceStatus =
  | 'CLEARED'
  | 'NEEDS_LICENCE'
  | 'PERSONAL_ONLY'
  | 'BLOCKED'
  | 'UNKNOWN'

export interface SourceDisplayRights {
  headline: boolean
  snippetChars: number
  link: boolean
  embed: boolean
}

export interface AdminSource {
  id: number
  name: string
  type: SourceType
  reliabilityScore: number
  hitCount: number
  missCount: number
  country: string | null
  url: string | null
  licenceStatus: SourceLicenceStatus
  licenceNote: string | null
  termsUrl: string | null
  displayRights: SourceDisplayRights | null
  licenceReviewedAt: string | null
  _count: { rumours: number }
}

// ─── Provenance-first evidence model + calibrated forecasting (2026-08-14) ──
// Parallel to Rumour above — see docs/forecasting-audit.md and
// docs/forecasting-methodology.md for why these are a second model rather
// than a Rumour extension.

export type ClaimStatus = 'ACTIVE' | 'DENIED' | 'SUPERSEDED' | 'CONFIRMED' | 'EXPIRED'
export type TransferType = 'PERMANENT' | 'LOAN' | 'FREE' | 'UNKNOWN'
export type EvidenceDirection = 'SUPPORTS' | 'CONTRADICTS' | 'CONFIRMS' | 'DENIES' | 'CONTEXTUAL'
export type ForecastDisplayMode = 'PRECISE' | 'INTERVAL' | 'INSUFFICIENT_DATA'

export interface EvidenceItemData {
  id: number
  claimId: number
  sourceId: number
  canonicalUrl: string
  publishedAt: string
  fetchedAt: string
  authorName: string | null
  sourceType: SourceType
  title: string
  rawExcerpt: string
  evidenceDirection: EvidenceDirection
  parentEvidenceItemId: number | null
  provenanceRootId: number | null
  extractionConfidence: number
  // Present when the API response embeds the source's name/tier alongside
  // the evidence item (not persisted on EvidenceItem itself — joined at
  // read time). Optional because not every endpoint includes it.
  sourceName?: string
  sourceTier?: number | null
}

export interface ProvenanceCluster {
  root: EvidenceItemData
  syndicated: EvidenceItemData[]
}

export interface Claim {
  id: number
  playerId: number
  fromClubId: number | null
  toClubId: number | null
  transferType: TransferType
  statedFee: number | null
  statedContractLengthMonths: number | null
  claimStatus: ClaimStatus
  window: TransferWindow | null
  firstSeenAt: string
  lastEvidenceAt: string
  // Denormalized display fields — not on the raw DB row, populated by the
  // claim detail endpoint/fixtures for convenience.
  player?: Player
  fromClub?: Club | null
  toClub?: Club | null
}

export interface ClaimDetail extends Claim {
  evidenceCount: number
  independentSourceCount: number
  provenanceClusters: ProvenanceCluster[]
  officialConfirmation: EvidenceItemData | null
  officialDenial: EvidenceItemData | null
}

export interface ForecastDisplayData {
  displayMode: ForecastDisplayMode
  calibratedProbability?: number
  uncertaintyLow?: number
  uncertaintyHigh?: number
  rawScore?: number
  modelVersion?: string
  insufficientDataReason?: string
  featureSnapshotHash: string
  predictionTimestamp?: string
}

export interface ForecastHistoryPoint {
  predictionTimestamp: string
  calibratedProbability: number | null
  uncertaintyLow: number | null
  uncertaintyHigh: number | null
  displayMode: ForecastDisplayMode
  rawScore: number | null
}

export interface ForecastFactor {
  label: string
  direction: 'positive' | 'negative'
  magnitude: number // 0–1, relative weight for sizing/sorting
  explanation: string
  evidenceItemId?: number
}

export interface ModelHealthDefinition {
  id: number
  version: number
  horizonDays: number
  currentModel: {
    version: string
    trainedAt: string
    trainingDataSource: string
    nTrainSamples: number
    nTestSamples: number
    minSampleSizeForPrecise: number
    meetsMinSampleSize: boolean
    brierScore: number | null
    logLoss: number | null
    calibrationCurve: { binLow: number; binHigh: number; meanPredicted: number; empiricalRate: number; n: number }[] | null
  } | null
}

export interface ModelHealthResponse {
  definitions: ModelHealthDefinition[]
  mlService: { reachable: boolean; detail?: unknown }
}

// Monetisation entitlement model (2026-08-14) — see
// docs/monetisation-proposal.md.
export type EntitlementTier = 'FREE' | 'PRO' | 'RESEARCH'
export type EntitlementDenialReason = 'INSUFFICIENT_TIER' | 'FEATURE_DISABLED'

export interface EntitlementDenial {
  reason?: EntitlementDenialReason
  requiredTier: EntitlementTier
  currentTier?: EntitlementTier
  limit?: number
}

export interface WatchlistItem {
  id: number
  userId: number
  playerId: number
  alertMode: 'DELAYED' | 'INSTANT'
  createdAt: string
  player: Player & { currentClub: Club | null }
}

export interface ClubLocationCandidate {
  club: {
    id: number
    name: string
    country: string
    league: string
    currentLat: number | null
    currentLng: number | null
  }
  candidate: {
    wikidataId: string | null
    label: string | null
    lat: number | null
    lng: number | null
    stadium: string | null
    city: string | null
    confidence: number
    sourceUrl: string | null
  }
}

export interface UnplacedClub {
  id: number
  name: string
  country: string
  league: string
}

export interface ClubLocationsReviewResponse {
  candidates: ClubLocationCandidate[]
  unplaced: UnplacedClub[]
}

export type AgentKind = 'PERSON' | 'AGENCY'
export type PlayerAgentRole = 'REPRESENTS' | 'NEGOTIATED_DEAL'

/** Cited agent link on a player page (public GET /players/:id/agents). */
export interface PlayerAgentLink {
  linkId: number
  role: PlayerAgentRole
  rumourId: number | null
  agent: { id: number; name: string; kind: AgentKind; agency: string | null }
  citations: { url: string; host: string; quote: string | null; addedAt: string }[]
}

export interface AdminAgentSuggestion {
  id: number
  name: string
  kind: AgentKind
  agency: string | null
  players: number
}

// ─── Football data (TheStatsAPI snapshots) ───

export interface FootballCompetition {
  id: number
  name: string
  country: string
  type: string
  season: { id: number; name: string } | null
}

export interface StandingRow {
  position: number
  clubId: number
  club: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: string | null
  xgFor: number | null
  xgAgainst: number | null
  groupLabel: string
}

export interface LeaderEntry {
  playerId: number
  name: string
  clubId: number | null
  value: number
}

export interface CompetitionTable {
  source: string
  competition: string
  season: string
  matchday: number | null
  frozenAt: string | null
  standings: StandingRow[]
  leaders: {
    goals: LeaderEntry[]
    assists: LeaderEntry[]
    xg: LeaderEntry[]
    rating: LeaderEntry[]
  } | null
}

export interface SquadPlayer {
  id: number
  name: string
  positionGroup: string | null
  shirtNumber: number | null
  age: number | null
  nationality: string | null
  competition: string
  appearances: number
  minutes: number
  goals: number
  assists: number
  rating: number | null
  card: {
    overall: number
    attributes: {
      finishing: number
      creation: number
      passing: number
      dribbling: number
      defending: number
      duels: number
      discipline: number
    }
    limitedSample: boolean
  } | null
}

export interface ClubSquad {
  source: string
  club: { id: number; name: string }
  players: SquadPlayer[]
}

export interface CardAttributes {
  finishing: number
  creation: number
  passing: number
  dribbling: number
  defending: number
  duels: number
  discipline: number
}

export interface PlayerCardData {
  playerId?: number
  positionGroup: string
  overall: number
  attributes: CardAttributes
  limitedSample: boolean
  minutes?: number
  poolSize?: number
}

export interface PlayerSeasonLine {
  competition: { id: number; name: string }
  season: string
  current: boolean
  clubId: number | null
  appearances: number
  starts: number
  minutes: number
  goals: number
  assists: number
  xg: number | null
  xa: number | null
  rating: number | null
  detail: Record<string, Record<string, number | null>> | null
  card: PlayerCardData | null
}

export interface PlayerProfile {
  id: number
  name: string
  age: number | null
  nationality: string | null
  positionGroup: string | null
  dateOfBirth: string | null
  heightCm: number | null
  preferredFoot: string | null
  shirtNumber: number | null
  currentClubId: number | null
}

export interface PlayerFootballStatsResponse {
  source: string
  player: PlayerProfile
  seasons: PlayerSeasonLine[]
}

export interface MatchSide {
  id: number | null
  name: string
  goals: number | null
}

export interface MatchdayFixture {
  id: number
  kickoffAt: string
  status: string
  hasDetail: boolean
  home: MatchSide
  away: MatchSide
}

export interface MatchdayFixturesResponse {
  source: string
  matchday: number
  fixtures: MatchdayFixture[]
}

export interface MatchLineupPlayer {
  id: string
  name: string
  position: string | null
  shirt: number | null
}

export interface MatchLineupSide {
  teamId: string
  formation: string | null
  startingXi: MatchLineupPlayer[]
  bench: MatchLineupPlayer[]
}

export interface MatchLineups {
  confirmed: boolean
  home: MatchLineupSide | null
  away: MatchLineupSide | null
}

export interface MatchEventRef {
  id: string
  name: string
}

export interface MatchEvent {
  minute: number | null
  extra: number
  period: string | number | null
  type: string
  team: MatchEventRef | null
  player: MatchEventRef | null
  related: MatchEventRef | null
}

export interface MatchTeamStatPair {
  home: number | null
  away: number | null
}

export type MatchTeamStats = Record<string, MatchTeamStatPair | unknown>

export interface MatchPlayerStat {
  playerId: string
  name: string
  teamId: string
  position: string | null
  rating: number | null
  started: boolean
  minutes: number
  goals: number
  assists: number
  xg: number | null
  xa: number | null
  shots: number
  onTarget: number
  passes: number
  accuratePasses: number
  keyPasses: number
  tackles: number | null
  interceptions: number | null
  duelsWon: number | null
  saves: number | null
}

export interface MatchShot {
  playerId: string
  player: string
  teamId: string
  minute: number | null
  x: number
  y: number
  xg: number | null
  result: string | null
  situation: string | null
  bodyPart: string | null
  isGoal: boolean
}

export interface MatchDetailPayload {
  lineups: MatchLineups
  events: MatchEvent[]
  teamStats: MatchTeamStats
  playerStats: MatchPlayerStat[]
  shots: MatchShot[]
}

export interface MatchResponse {
  source: string
  match: {
    id: number
    competition: { id: number; name: string }
    season: string
    matchday: number
    kickoffAt: string
    status: string
    home: MatchSide
    away: MatchSide
  }
  galliaPlayerIds: Record<string, number>
  detail: MatchDetailPayload | null
}

