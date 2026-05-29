ALTER TABLE "app_settings" ADD COLUMN "weeklyActivityChestDaysVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_settings" ADD COLUMN "weeklyActivityPresenceDaysVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_settings" ADD COLUMN "weeklyActivityPatientsVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_settings" ADD COLUMN "weeklyActivitySherifsVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_settings" ADD COLUMN "weeklyActivityInfusionsVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "app_settings" ADD COLUMN "weeklyActivityPoppyMilkVisible" BOOLEAN NOT NULL DEFAULT true;
