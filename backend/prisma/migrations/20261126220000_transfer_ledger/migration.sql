-- Transfers, contract history, provider values (docs/transfer-database-plan.md, phase 1). Additive.
-- AlterTable
ALTER TABLE "players" ADD COLUMN     "tsaTeamId" TEXT;

-- CreateTable
CREATE TABLE "transfers" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "fromClubId" INTEGER,
    "toClubId" INTEGER,
    "fromTeamName" TEXT,
    "toTeamName" TEXT,
    "fromTeamQid" TEXT,
    "toTeamQid" TEXT,
    "date" TIMESTAMP(3),
    "datePrecision" TEXT NOT NULL DEFAULT 'day',
    "type" TEXT NOT NULL DEFAULT 'unknown',
    "feeAmount" DOUBLE PRECISION,
    "feeCurrency" TEXT,
    "feeStatus" TEXT NOT NULL DEFAULT 'unknown',
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_facts" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "clubId" INTEGER,
    "expiresOn" TIMESTAMP(3) NOT NULL,
    "signedOn" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "contract_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_values" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT,
    "observedOn" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'thestatsapi',

    CONSTRAINT "provider_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfers_dedupeKey_key" ON "transfers"("dedupeKey");

-- CreateIndex
CREATE INDEX "transfers_playerId_date_idx" ON "transfers"("playerId", "date");

-- CreateIndex
CREATE INDEX "transfers_toClubId_date_idx" ON "transfers"("toClubId", "date");

-- CreateIndex
CREATE INDEX "transfers_fromClubId_date_idx" ON "transfers"("fromClubId", "date");

-- CreateIndex
CREATE INDEX "contract_facts_playerId_supersededAt_idx" ON "contract_facts"("playerId", "supersededAt");

-- CreateIndex
CREATE INDEX "contract_facts_expiresOn_idx" ON "contract_facts"("expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "provider_values_playerId_observedOn_key" ON "provider_values"("playerId", "observedOn");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_facts" ADD CONSTRAINT "contract_facts_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_values" ADD CONSTRAINT "provider_values_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

