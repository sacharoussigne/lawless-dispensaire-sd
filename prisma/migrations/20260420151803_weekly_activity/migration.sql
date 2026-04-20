-- CreateEnum
CREATE TYPE "DispensaryWeeklyActivityHistoryAction" AS ENUM ('CREATE', 'DELETE', 'UPDATE', 'INCREMENT_CHEST', 'DECREMENT_CHEST', 'UPDATE_CHEST_DAYS', 'UPDATE_PRESENCE_DAYS', 'INCREMENT_SHERIFF', 'DECREMENT_SHERIFF', 'INCREMENT_PATIENTS', 'DECREMENT_PATIENTS', 'INCREMENT_INFUSIONS', 'DECREMENT_INFUSIONS', 'INCREMENT_POPPY_MILK', 'DECREMENT_POPPY_MILK');

-- CreateEnum
CREATE TYPE "DispensaryWeeklyActivityHistorySource" AS ENUM ('INTRANET', 'DISCORD_BOT');

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "featureWeeklyDispensaryActivityEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "dispensary_weekly_activity" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "displayName" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "userId" TEXT,
    "chestDays" JSONB NOT NULL,
    "presenceDays" JSONB NOT NULL,
    "sherifCount" INTEGER NOT NULL DEFAULT 0,
    "patientsCount" INTEGER NOT NULL DEFAULT 0,
    "infusionsCount" INTEGER NOT NULL DEFAULT 0,
    "poppyMilkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensary_weekly_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispensary_weekly_activity_history" (
    "id" TEXT NOT NULL,
    "activityId" TEXT,
    "action" "DispensaryWeeklyActivityHistoryAction" NOT NULL,
    "source" "DispensaryWeeklyActivityHistorySource" NOT NULL,
    "actorUserId" TEXT,
    "actorDiscordUserId" TEXT,
    "previousValues" JSONB,
    "nextValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispensary_weekly_activity_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dispensary_weekly_activity_discordUserId_idx" ON "dispensary_weekly_activity"("discordUserId");

-- CreateIndex
CREATE INDEX "dispensary_weekly_activity_userId_idx" ON "dispensary_weekly_activity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dispensary_weekly_activity_discordUserId_periodStart_period_key" ON "dispensary_weekly_activity"("discordUserId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "dispensary_weekly_activity_history_activityId_idx" ON "dispensary_weekly_activity_history"("activityId");

-- CreateIndex
CREATE INDEX "dispensary_weekly_activity_history_actorUserId_idx" ON "dispensary_weekly_activity_history"("actorUserId");

-- AddForeignKey
ALTER TABLE "dispensary_weekly_activity" ADD CONSTRAINT "dispensary_weekly_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_weekly_activity_history" ADD CONSTRAINT "dispensary_weekly_activity_history_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "dispensary_weekly_activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensary_weekly_activity_history" ADD CONSTRAINT "dispensary_weekly_activity_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
