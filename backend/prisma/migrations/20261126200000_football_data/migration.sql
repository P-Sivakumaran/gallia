-- Football data (docs/football-data-plan.md, phase 1). Additive: nullable player columns and new tables.
-- AlterTable
ALTER TABLE "players" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "positionGroup" TEXT,
ADD COLUMN     "preferredFoot" TEXT,
ADD COLUMN     "shirtNumber" INTEGER,
ADD COLUMN     "tsaPlayerId" TEXT;

-- CreateTable
CREATE TABLE "competitions" (
    "id" SERIAL NOT NULL,
    "tsaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "countryCode" TEXT,
    "type" TEXT NOT NULL,
    "hasPlayerStats" BOOLEAN NOT NULL DEFAULT false,
    "xgAvailable" BOOLEAN NOT NULL DEFAULT false,
    "tracked" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "tsaId" TEXT NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" SERIAL NOT NULL,
    "tsaId" TEXT NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "matchday" INTEGER,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "homeClubId" INTEGER,
    "awayClubId" INTEGER,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "detailFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,
    "groupLabel" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "goalDifference" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "form" TEXT,
    "xgFor" DOUBLE PRECISION,
    "xgAgainst" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_season_stats" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "clubId" INTEGER,
    "positionGroup" TEXT,
    "rating" DOUBLE PRECISION,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "starts" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "xg" DOUBLE PRECISION,
    "xa" DOUBLE PRECISION,
    "detail" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gameweek_snapshots" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "matchday" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gameweek_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_requests" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "quotaRemaining" INTEGER,
    "quotaResetAt" TIMESTAMP(3),
    "competitionId" INTEGER,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_tsaId_key" ON "competitions"("tsaId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_tsaId_key" ON "seasons"("tsaId");

-- CreateIndex
CREATE INDEX "seasons_competitionId_isCurrent_idx" ON "seasons"("competitionId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_tsaId_key" ON "fixtures"("tsaId");

-- CreateIndex
CREATE INDEX "fixtures_seasonId_matchday_idx" ON "fixtures"("seasonId", "matchday");

-- CreateIndex
CREATE INDEX "fixtures_status_kickoffAt_idx" ON "fixtures"("status", "kickoffAt");

-- CreateIndex
CREATE UNIQUE INDEX "standings_seasonId_clubId_groupLabel_key" ON "standings"("seasonId", "clubId", "groupLabel");

-- CreateIndex
CREATE INDEX "player_season_stats_seasonId_positionGroup_idx" ON "player_season_stats"("seasonId", "positionGroup");

-- CreateIndex
CREATE UNIQUE INDEX "player_season_stats_playerId_seasonId_key" ON "player_season_stats"("playerId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "gameweek_snapshots_seasonId_matchday_key" ON "gameweek_snapshots"("seasonId", "matchday");

-- CreateIndex
CREATE INDEX "provider_requests_provider_at_idx" ON "provider_requests"("provider", "at");

-- CreateIndex
CREATE UNIQUE INDEX "players_tsaPlayerId_key" ON "players"("tsaPlayerId");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweek_snapshots" ADD CONSTRAINT "gameweek_snapshots_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
