-- Legacy index was global (discord + period); uniqueness must be per dispensary.
DROP INDEX IF EXISTS "dispensary_weekly_activity_discordUserId_periodStart_period_key";
DROP INDEX IF EXISTS "dispensary_weekly_activity_discordUserId_periodStart_periodEnd_key";

CREATE UNIQUE INDEX IF NOT EXISTS "dispensary_weekly_activity_dispensaryId_discordUserId_periodStart_periodEnd_key"
ON "dispensary_weekly_activity"("dispensaryId", "discordUserId", "periodStart", "periodEnd");
