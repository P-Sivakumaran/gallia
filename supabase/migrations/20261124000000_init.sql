-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EntitlementTier" AS ENUM ('FREE', 'PRO', 'RESEARCH');

-- CreateEnum
CREATE TYPE "EntitlementSource" AS ENUM ('MANUAL');

-- CreateEnum
CREATE TYPE "AlertMode" AS ENUM ('DELAYED', 'INSTANT');

-- CreateEnum
CREATE TYPE "ProductEventType" AS ENUM ('WATCHLIST_CREATED', 'ALERT_ACTIVATED', 'PROVENANCE_PANEL_VIEWED', 'FORECAST_HISTORY_VIEWED', 'UPGRADE_INTEREST_CLICKED');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('JOURNALIST', 'CLUB_OFFICIAL', 'AGENT', 'NEWS_OUTLET', 'SOCIAL_MEDIA', 'AGGREGATOR');

-- CreateEnum
CREATE TYPE "TransferWindow" AS ENUM ('SUMMER', 'WINTER', 'FREE_AGENT');

-- CreateEnum
CREATE TYPE "RumourStatus" AS ENUM ('PENDING', 'HOT', 'COMPLETED', 'FAILED', 'DENIED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('PERMANENT', 'LOAN', 'FREE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('ACTIVE', 'DENIED', 'SUPERSEDED', 'CONFIRMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EvidenceDirection" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'CONFIRMS', 'DENIES', 'CONTEXTUAL');

-- CreateEnum
CREATE TYPE "SourceReviewStatus" AS ENUM ('UNREVIEWED', 'APPROVED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ForecastDisplayMode" AS ENUM ('PRECISE', 'INTERVAL', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('ENTITLEMENT_GRANT');

-- CreateEnum
CREATE TYPE "ApiKeyScope" AS ENUM ('RESEARCH_READ', 'RESEARCH_EXPORT');

-- CreateEnum
CREATE TYPE "ApiEndpointCategory" AS ENUM ('HISTORICAL_CLAIMS', 'EVIDENCE_METADATA');

-- CreateEnum
CREATE TYPE "ApiResponseClass" AS ENUM ('SUCCESS', 'UNAUTHORIZED', 'FORBIDDEN', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "OperationalEventType" AS ENUM ('ENTITLEMENT_DENIED', 'FEATURE_FLAG_DENIED', 'WATCHLIST_CAP_REACHED', 'API_KEY_ACCEPTED', 'API_KEY_REJECTED', 'API_KEY_RATE_LIMITED', 'ADMIN_TIER_GRANT_SUCCESS', 'ADMIN_TIER_GRANT_FAILURE', 'RETENTION_PURGE_SUCCESS', 'RETENTION_PURGE_FAILURE');

-- CreateTable
CREATE TABLE "clubs" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "league" TEXT NOT NULL DEFAULT 'Unknown',
    "country" TEXT NOT NULL DEFAULT 'Unknown',
    "logoUrl" TEXT,
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "position" "Position",
    "currentClubId" INTEGER,
    "contractEnd" TIMESTAMP(3),
    "marketValue" DOUBLE PRECISION,
    "nationality" TEXT,
    "photoUrl" TEXT,
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "wikidataId" TEXT,
    "enrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tier" "EntitlementTier" NOT NULL DEFAULT 'FREE',
    "entitlementSource" "EntitlementSource" NOT NULL DEFAULT 'MANUAL',
    "entitlementGrantedAt" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'USER',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_players" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "alertMode" "AlertMode" NOT NULL DEFAULT 'DELAYED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_events" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "eventType" "ProductEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "missCount" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT,
    "url" TEXT,
    "tier" INTEGER,
    "journalistHandle" TEXT,
    "leagueCoverage" JSONB,
    "manualReviewStatus" "SourceReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rumours" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT,
    "playerId" INTEGER NOT NULL,
    "fromClubId" INTEGER NOT NULL,
    "toClubId" INTEGER NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "reportedFeeMin" DOUBLE PRECISION,
    "reportedFeeMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "rumourDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "window" "TransferWindow" NOT NULL,
    "baseProbability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "computedLikelihood" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "RumourStatus" NOT NULL DEFAULT 'PENDING',
    "distinctSourceCount" INTEGER NOT NULL DEFAULT 1,
    "fromClubInferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "contradicts" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rumours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_snapshots" (
    "id" SERIAL NOT NULL,
    "rumourId" INTEGER NOT NULL,
    "sourceReliability" DOUBLE PRECISION NOT NULL,
    "monthsToContractExpiry" DOUBLE PRECISION,
    "reportedFeeMin" DOUBLE PRECISION,
    "reportedFeeMax" DOUBLE PRECISION,
    "marketValue" DOUBLE PRECISION,
    "clubNeedScore" DOUBLE PRECISION NOT NULL,
    "distinctSourceCount" INTEGER NOT NULL,
    "baseProbability" DOUBLE PRECISION,
    "score" DOUBLE PRECISION NOT NULL,
    "scoreSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rumour_history" (
    "id" SERIAL NOT NULL,
    "rumourId" INTEGER NOT NULL,
    "computedLikelihood" DOUBLE PRECISION NOT NULL,
    "status" "RumourStatus" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rumour_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_signals" (
    "id" SERIAL NOT NULL,
    "sourceName" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "rawText" TEXT NOT NULL,
    "impliedReliability" DOUBLE PRECISION,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "rumourId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "fromClubId" INTEGER,
    "toClubId" INTEGER,
    "transferType" "TransferType" NOT NULL DEFAULT 'UNKNOWN',
    "statedFee" DOUBLE PRECISION,
    "statedContractLengthMonths" INTEGER,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'ACTIVE',
    "window" "TransferWindow",
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEvidenceAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_items" (
    "id" SERIAL NOT NULL,
    "claimId" INTEGER NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorName" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "rawExcerpt" TEXT NOT NULL,
    "extractedAttributions" JSONB,
    "evidenceDirection" "EvidenceDirection" NOT NULL DEFAULT 'SUPPORTS',
    "parentEvidenceItemId" INTEGER,
    "provenanceRootId" INTEGER,
    "extractionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_duplicate_candidates" (
    "id" SERIAL NOT NULL,
    "evidenceItemId" INTEGER NOT NULL,
    "candidateItemId" INTEGER NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_duplicate_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_definitions" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "summerCutoffMonthDay" TEXT NOT NULL DEFAULT '08-31',
    "winterCutoffMonthDay" TEXT NOT NULL DEFAULT '01-31',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" SERIAL NOT NULL,
    "forecastDefinitionId" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "trainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainingDataSource" TEXT NOT NULL,
    "nTrainSamples" INTEGER NOT NULL,
    "nTestSamples" INTEGER NOT NULL,
    "trainStart" TIMESTAMP(3),
    "trainEnd" TIMESTAMP(3),
    "testStart" TIMESTAMP(3),
    "testEnd" TIMESTAMP(3),
    "brierScore" DOUBLE PRECISION,
    "logLoss" DOUBLE PRECISION,
    "calibrationCurve" JSONB,
    "minSampleSizeForPrecise" INTEGER NOT NULL DEFAULT 200,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_forecasts" (
    "id" SERIAL NOT NULL,
    "claimId" INTEGER NOT NULL,
    "forecastDefinitionId" INTEGER NOT NULL,
    "modelVersionId" INTEGER,
    "predictionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "featureSnapshot" JSONB NOT NULL,
    "featureSnapshotHash" TEXT NOT NULL,
    "rawScore" DOUBLE PRECISION,
    "calibratedProbability" DOUBLE PRECISION,
    "uncertaintyLow" DOUBLE PRECISION,
    "uncertaintyHigh" DOUBLE PRECISION,
    "displayMode" "ForecastDisplayMode" NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    "insufficientDataReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_events" (
    "id" SERIAL NOT NULL,
    "actingAdminUserId" INTEGER NOT NULL,
    "actionType" "AdminActionType" NOT NULL,
    "targetUserId" INTEGER NOT NULL,
    "previousTier" "EntitlementTier",
    "newTier" "EntitlementTier",
    "entitlementSource" "EntitlementSource",
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" "ApiKeyScope"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_usage_events" (
    "id" SERIAL NOT NULL,
    "apiKeyId" INTEGER,
    "endpointCategory" "ApiEndpointCategory" NOT NULL,
    "responseClass" "ApiResponseClass" NOT NULL,
    "rateLimitState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_events" (
    "id" SERIAL NOT NULL,
    "eventType" "OperationalEventType" NOT NULL,
    "correlationId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purge_health" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastRunStartedAt" TIMESTAMP(3),
    "lastRunCompletedAt" TIMESTAMP(3),
    "lastRunSucceeded" BOOLEAN,
    "lastDeletedCount" INTEGER,
    "lastCutoff" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purge_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_externalId_key" ON "clubs"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "players_externalId_key" ON "players"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_players_userId_playerId_key" ON "watchlist_players"("userId", "playerId");

-- CreateIndex
CREATE INDEX "product_events_eventType_createdAt_idx" ON "product_events"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "product_events_userId_idx" ON "product_events"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rumours_externalId_key" ON "rumours"("externalId");

-- CreateIndex
CREATE INDEX "scoring_snapshots_rumourId_idx" ON "scoring_snapshots"("rumourId");

-- CreateIndex
CREATE INDEX "rumour_history_rumourId_recordedAt_idx" ON "rumour_history"("rumourId", "recordedAt");

-- CreateIndex
CREATE INDEX "raw_signals_sourceName_publishedAt_idx" ON "raw_signals"("sourceName", "publishedAt");

-- CreateIndex
CREATE INDEX "raw_signals_matched_idx" ON "raw_signals"("matched");

-- CreateIndex
CREATE INDEX "raw_signals_link_idx" ON "raw_signals"("link");

-- CreateIndex
CREATE INDEX "claims_playerId_fromClubId_toClubId_idx" ON "claims"("playerId", "fromClubId", "toClubId");

-- CreateIndex
CREATE INDEX "claims_claimStatus_idx" ON "claims"("claimStatus");

-- CreateIndex
CREATE INDEX "evidence_items_claimId_idx" ON "evidence_items"("claimId");

-- CreateIndex
CREATE INDEX "evidence_items_provenanceRootId_idx" ON "evidence_items"("provenanceRootId");

-- CreateIndex
CREATE INDEX "evidence_items_sourceId_idx" ON "evidence_items"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_items_canonicalUrl_claimId_key" ON "evidence_items"("canonicalUrl", "claimId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_duplicate_candidates_evidenceItemId_candidateItemI_key" ON "evidence_duplicate_candidates"("evidenceItemId", "candidateItemId");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_definitions_version_key" ON "forecast_definitions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "model_versions_version_key" ON "model_versions"("version");

-- CreateIndex
CREATE INDEX "model_versions_forecastDefinitionId_isCurrent_idx" ON "model_versions"("forecastDefinitionId", "isCurrent");

-- CreateIndex
CREATE INDEX "claim_forecasts_claimId_predictionTimestamp_idx" ON "claim_forecasts"("claimId", "predictionTimestamp");

-- CreateIndex
CREATE INDEX "admin_audit_events_targetUserId_createdAt_idx" ON "admin_audit_events"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_events_actingAdminUserId_createdAt_idx" ON "admin_audit_events"("actingAdminUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyPrefix_key" ON "api_keys"("keyPrefix");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "api_key_usage_events_apiKeyId_createdAt_idx" ON "api_key_usage_events"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "operational_events_eventType_createdAt_idx" ON "operational_events"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_currentClubId_fkey" FOREIGN KEY ("currentClubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_players" ADD CONSTRAINT "watchlist_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_players" ADD CONSTRAINT "watchlist_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rumours" ADD CONSTRAINT "rumours_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rumours" ADD CONSTRAINT "rumours_fromClubId_fkey" FOREIGN KEY ("fromClubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rumours" ADD CONSTRAINT "rumours_toClubId_fkey" FOREIGN KEY ("toClubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rumours" ADD CONSTRAINT "rumours_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rumours" ADD CONSTRAINT "rumours_contradicts_fkey" FOREIGN KEY ("contradicts") REFERENCES "rumours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scoring_snapshots" ADD CONSTRAINT "scoring_snapshots_rumourId_fkey" FOREIGN KEY ("rumourId") REFERENCES "rumours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rumour_history" ADD CONSTRAINT "rumour_history_rumourId_fkey" FOREIGN KEY ("rumourId") REFERENCES "rumours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_fromClubId_fkey" FOREIGN KEY ("fromClubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_toClubId_fkey" FOREIGN KEY ("toClubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_parentEvidenceItemId_fkey" FOREIGN KEY ("parentEvidenceItemId") REFERENCES "evidence_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_provenanceRootId_fkey" FOREIGN KEY ("provenanceRootId") REFERENCES "evidence_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_duplicate_candidates" ADD CONSTRAINT "evidence_duplicate_candidates_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "evidence_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_duplicate_candidates" ADD CONSTRAINT "evidence_duplicate_candidates_candidateItemId_fkey" FOREIGN KEY ("candidateItemId") REFERENCES "evidence_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_versions" ADD CONSTRAINT "model_versions_forecastDefinitionId_fkey" FOREIGN KEY ("forecastDefinitionId") REFERENCES "forecast_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_forecasts" ADD CONSTRAINT "claim_forecasts_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_forecasts" ADD CONSTRAINT "claim_forecasts_forecastDefinitionId_fkey" FOREIGN KEY ("forecastDefinitionId") REFERENCES "forecast_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_forecasts" ADD CONSTRAINT "claim_forecasts_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_actingAdminUserId_fkey" FOREIGN KEY ("actingAdminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_usage_events" ADD CONSTRAINT "api_key_usage_events_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

