-- Source licence registry (docs/news-scanner-plan.md Phase A). Additive: new enum and nullable/defaulted columns.
CREATE TYPE "SourceLicenceStatus" AS ENUM ('CLEARED', 'NEEDS_LICENCE', 'PERSONAL_ONLY', 'BLOCKED', 'UNKNOWN');

ALTER TABLE "sources"
  ADD COLUMN "licenceStatus" "SourceLicenceStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "licenceNote" TEXT,
  ADD COLUMN "termsUrl" TEXT,
  ADD COLUMN "displayRights" JSONB,
  ADD COLUMN "storeFullText" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dailyRequestBudget" INTEGER,
  ADD COLUMN "licenceReviewedAt" TIMESTAMP(3);
