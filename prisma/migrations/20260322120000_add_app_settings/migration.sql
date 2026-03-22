-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "dispensaryName" TEXT NOT NULL DEFAULT 'Saint-Denis',
    "featureStockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featureBankEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featurePrivatePracticeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featureOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featureSearchEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featureMailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "app_settings" ("id", "dispensaryName", "featureStockEnabled", "featureBankEnabled", "featurePrivatePracticeEnabled", "featureOrdersEnabled", "featureSearchEnabled", "featureMailsEnabled", "createdAt", "updatedAt")
VALUES ('default', 'Saint-Denis', true, true, true, true, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
