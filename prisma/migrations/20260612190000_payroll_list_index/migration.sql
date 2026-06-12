-- CreateIndex
CREATE INDEX "payroll_weekly_report_dispensaryId_weekStart_idx" ON "payroll_weekly_report"("dispensaryId", "weekStart" DESC);
