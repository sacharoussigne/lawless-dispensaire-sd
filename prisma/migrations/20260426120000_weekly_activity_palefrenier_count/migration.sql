-- AlterEnum
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'INCREMENT_PALEFRENIER';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'DECREMENT_PALEFRENIER';

-- AlterTable
ALTER TABLE "dispensary_weekly_activity" ADD COLUMN "palefrenierCount" INTEGER NOT NULL DEFAULT 0;
