-- CreateEnum
CREATE TYPE "PayrollWeeklyReportStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "payroll_weekly_report" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayrollWeeklyReportStatus" NOT NULL DEFAULT 'PROCESSING',
    "resultJson" JSONB,
    "screenshotKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_weekly_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_weekly_report_weekStart_key" ON "payroll_weekly_report"("weekStart");

-- CreateIndex
CREATE INDEX "payroll_weekly_report_createdById_idx" ON "payroll_weekly_report"("createdById");

-- CreateIndex
CREATE INDEX "payroll_weekly_report_weekStart_idx" ON "payroll_weekly_report"("weekStart");

-- AddForeignKey
ALTER TABLE "payroll_weekly_report" ADD CONSTRAINT "payroll_weekly_report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
