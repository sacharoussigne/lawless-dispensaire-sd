-- CreateIndex
CREATE INDEX "dispensary_weekly_activity_dispensaryId_periodStart_idx" ON "dispensary_weekly_activity"("dispensaryId", "periodStart");

-- CreateIndex
CREATE INDEX "dispensary_weekly_activity_history_activityId_createdAt_idx" ON "dispensary_weekly_activity_history"("activityId", "createdAt");
