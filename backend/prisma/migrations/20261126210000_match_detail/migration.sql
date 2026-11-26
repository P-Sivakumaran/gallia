-- Match detail for match pages (docs/football-data-plan.md). Additive: one new table.
-- CreateTable
CREATE TABLE "match_details" (
    "id" SERIAL NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "lineups" JSONB NOT NULL,
    "events" JSONB NOT NULL,
    "teamStats" JSONB NOT NULL,
    "playerStats" JSONB NOT NULL,
    "shots" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_details_fixtureId_key" ON "match_details"("fixtureId");

-- AddForeignKey
ALTER TABLE "match_details" ADD CONSTRAINT "match_details_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "fixtures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

