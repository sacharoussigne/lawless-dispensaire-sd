-- AlterTable
ALTER TABLE "payroll_weekly_report" DROP COLUMN IF EXISTS "status";

-- DropEnum
DROP TYPE IF EXISTS "PayrollWeeklyReportStatus";
