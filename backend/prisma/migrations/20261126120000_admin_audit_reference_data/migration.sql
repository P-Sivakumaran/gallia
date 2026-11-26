-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminActionType" ADD VALUE 'CLUB_LOCATION_ACCEPT';
ALTER TYPE "AdminActionType" ADD VALUE 'CLUB_LOCATION_REJECT';
ALTER TYPE "AdminActionType" ADD VALUE 'CLUB_LOCATION_MANUAL';

-- AlterTable
ALTER TABLE "admin_audit_events" ADD COLUMN     "details" JSONB,
ADD COLUMN     "targetId" INTEGER,
ADD COLUMN     "targetType" TEXT,
ALTER COLUMN "targetUserId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "admin_audit_events_targetType_targetId_createdAt_idx" ON "admin_audit_events"("targetType", "targetId", "createdAt");

