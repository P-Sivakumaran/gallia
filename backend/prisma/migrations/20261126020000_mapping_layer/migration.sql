-- CreateEnum
CREATE TYPE "AgentKind" AS ENUM ('PERSON', 'AGENCY');

-- CreateEnum
CREATE TYPE "PlayerAgentRole" AS ENUM ('REPRESENTS', 'NEGOTIATED_DEAL');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "city" TEXT,
ADD COLUMN     "geoCheckedAt" TIMESTAMP(3),
ADD COLUMN     "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "stadium" TEXT,
ADD COLUMN     "wikidataId" TEXT;

-- CreateTable
CREATE TABLE "agents" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AgentKind" NOT NULL,
    "agencyId" INTEGER,
    "fifaLicence" TEXT,
    "wikidataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_agents" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "agentId" INTEGER NOT NULL,
    "role" "PlayerAgentRole" NOT NULL,
    "rumourId" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sourced_facts" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "licence" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "sourced_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_fifaLicence_key" ON "agents"("fifaLicence");

-- CreateIndex
CREATE UNIQUE INDEX "agents_wikidataId_key" ON "agents"("wikidataId");

-- CreateIndex
CREATE INDEX "player_agents_agentId_idx" ON "player_agents"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "player_agents_playerId_agentId_role_rumourId_key" ON "player_agents"("playerId", "agentId", "role", "rumourId");

-- CreateIndex
CREATE INDEX "sourced_facts_entityType_entityId_field_idx" ON "sourced_facts"("entityType", "entityId", "field");

-- CreateIndex
CREATE INDEX "sourced_facts_source_idx" ON "sourced_facts"("source");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_wikidataId_key" ON "clubs"("wikidataId");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_agents" ADD CONSTRAINT "player_agents_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_agents" ADD CONSTRAINT "player_agents_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data-feed stand-ins ("TBC" etc.) are not places.
UPDATE "clubs" SET "isPlaceholder" = true
WHERE lower(trim("name")) IN ('tbc', 'tba', 'unknown', 'to be confirmed', 'to be announced');
