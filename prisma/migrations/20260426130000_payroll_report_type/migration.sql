-- DropIndex
DROP INDEX "payroll_weekly_report_weekStart_key";

-- AlterTable
ALTER TABLE "payroll_weekly_report" ADD COLUMN "reportType" TEXT NOT NULL DEFAULT 'Employés';

-- CreateIndex
CREATE UNIQUE INDEX "payroll_weekly_report_weekStart_reportType_key" ON "payroll_weekly_report"("weekStart", "reportType");
