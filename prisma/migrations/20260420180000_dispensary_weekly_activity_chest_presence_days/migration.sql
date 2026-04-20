-- AlterEnum
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'UPDATE_CHEST_DAYS';
ALTER TYPE "DispensaryWeeklyActivityHistoryAction" ADD VALUE 'UPDATE_PRESENCE_DAYS';

-- AlterTable
ALTER TABLE "dispensary_weekly_activity" ADD COLUMN "chestDays" JSONB NOT NULL DEFAULT '{"lundi":false,"mardi":false,"mercredi":false,"jeudi":false,"vendredi":false,"samedi":false,"dimanche":false}';
ALTER TABLE "dispensary_weekly_activity" ADD COLUMN "presenceDays" JSONB NOT NULL DEFAULT '{"lundi":false,"mardi":false,"mercredi":false,"jeudi":false,"vendredi":false,"samedi":false,"dimanche":false}';
ALTER TABLE "dispensary_weekly_activity" DROP COLUMN "chestCount";
