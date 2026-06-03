-- Multi-dispensary tenant migration

CREATE TABLE "dispensary" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "dispensary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dispensary_slug_key" ON "dispensary"("slug");
CREATE INDEX "dispensary_createdById_idx" ON "dispensary"("createdById");

CREATE TABLE "dispensary_member" (
    "id" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispensary_member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dispensary_member_dispensaryId_userId_key" ON "dispensary_member"("dispensaryId", "userId");
CREATE INDEX "dispensary_member_userId_idx" ON "dispensary_member"("userId");

-- Default tenant (stable id for backfill)
INSERT INTO "dispensary" ("id", "slug", "name", "createdAt", "updatedAt")
SELECT
    '00000000-0000-4000-8000-000000000001',
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE("dispensaryName", 'Saint-Denis')), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
    COALESCE("dispensaryName", 'Saint-Denis'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "app_settings"
WHERE "id" = 'default'
ON CONFLICT DO NOTHING;

INSERT INTO "dispensary" ("id", "slug", "name", "createdAt", "updatedAt")
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'saint-denis',
    'Saint-Denis',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Tenant-scoped tables: add column, backfill, enforce
ALTER TABLE "category_item" ADD COLUMN "dispensaryId" TEXT;
UPDATE "category_item" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "category_item" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "category_item_dispensaryId_idx" ON "category_item"("dispensaryId");

ALTER TABLE "item" ADD COLUMN "dispensaryId" TEXT;
UPDATE "item" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "item" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "item_dispensaryId_idx" ON "item"("dispensaryId");

ALTER TABLE "chest" ADD COLUMN "dispensaryId" TEXT;
UPDATE "chest" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "chest" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "chest_dispensaryId_idx" ON "chest"("dispensaryId");

ALTER TABLE "company" ADD COLUMN "dispensaryId" TEXT;
UPDATE "company" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "company" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "company_dispensaryId_idx" ON "company"("dispensaryId");

ALTER TABLE "company_group" ADD COLUMN "dispensaryId" TEXT;
UPDATE "company_group" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "company_group" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "company_group_dispensaryId_idx" ON "company_group"("dispensaryId");

ALTER TABLE "individual_customer" ADD COLUMN "dispensaryId" TEXT;
UPDATE "individual_customer" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "individual_customer" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "individual_customer_dispensaryId_idx" ON "individual_customer"("dispensaryId");

ALTER TABLE "order" ADD COLUMN "dispensaryId" TEXT;
UPDATE "order" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "order" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "order_dispensaryId_idx" ON "order"("dispensaryId");

ALTER TABLE "mail_template" ADD COLUMN "dispensaryId" TEXT;
UPDATE "mail_template" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "mail_template" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "mail_template_dispensaryId_idx" ON "mail_template"("dispensaryId");

ALTER TABLE "order_mail_template_assignment" ADD COLUMN "dispensaryId" TEXT;
UPDATE "order_mail_template_assignment" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "order_mail_template_assignment" ALTER COLUMN "dispensaryId" SET NOT NULL;

ALTER TABLE "mail" ADD COLUMN "dispensaryId" TEXT;
UPDATE "mail" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "mail" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "mail_dispensaryId_idx" ON "mail"("dispensaryId");

ALTER TABLE "bank_account" ADD COLUMN "dispensaryId" TEXT;
UPDATE "bank_account" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "bank_account" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "bank_account_dispensaryId_idx" ON "bank_account"("dispensaryId");

ALTER TABLE "transaction_name_suggestion" ADD COLUMN "dispensaryId" TEXT;
UPDATE "transaction_name_suggestion" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "transaction_name_suggestion" ALTER COLUMN "dispensaryId" SET NOT NULL;

ALTER TABLE "transaction_description_suggestion" ADD COLUMN "dispensaryId" TEXT;
UPDATE "transaction_description_suggestion" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "transaction_description_suggestion" ALTER COLUMN "dispensaryId" SET NOT NULL;

ALTER TABLE "patient_identity_suggestion" ADD COLUMN "dispensaryId" TEXT;
UPDATE "patient_identity_suggestion" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "patient_identity_suggestion" ALTER COLUMN "dispensaryId" SET NOT NULL;

ALTER TABLE "private_practice_week" ADD COLUMN "dispensaryId" TEXT;
UPDATE "private_practice_week" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "private_practice_week" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "private_practice_week_dispensaryId_idx" ON "private_practice_week"("dispensaryId");

ALTER TABLE "payroll_weekly_report" ADD COLUMN "dispensaryId" TEXT;
UPDATE "payroll_weekly_report" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "payroll_weekly_report" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "payroll_weekly_report_dispensaryId_idx" ON "payroll_weekly_report"("dispensaryId");

ALTER TABLE "dispensary_weekly_activity" ADD COLUMN "dispensaryId" TEXT;
UPDATE "dispensary_weekly_activity" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "dispensary_weekly_activity" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "dispensary_weekly_activity_dispensaryId_idx" ON "dispensary_weekly_activity"("dispensaryId");

ALTER TABLE "craft_recipe" ADD COLUMN "dispensaryId" TEXT;
UPDATE "craft_recipe" cr SET "dispensaryId" = i."dispensaryId"
FROM "item" i WHERE cr."craftedItemId" = i."id";
UPDATE "craft_recipe" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001' WHERE "dispensaryId" IS NULL;
ALTER TABLE "craft_recipe" ALTER COLUMN "dispensaryId" SET NOT NULL;
CREATE INDEX "craft_recipe_dispensaryId_idx" ON "craft_recipe"("dispensaryId");

-- App settings: migrate PK from id to dispensaryId
ALTER TABLE "app_settings" ADD COLUMN "dispensaryId" TEXT;
UPDATE "app_settings" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001' WHERE "id" = 'default';

INSERT INTO "app_settings" (
    "id",
    "dispensaryId",
    "dispensaryName",
    "featureStockEnabled",
    "featureBankEnabled",
    "featurePrivatePracticeEnabled",
    "featureOrdersEnabled",
    "featureSearchEnabled",
    "featureMailsEnabled",
    "featurePayrollEnabled",
    "featureWeeklyDispensaryActivityEnabled",
    "createdAt",
    "updatedAt"
)
SELECT
    'default',
    '00000000-0000-4000-8000-000000000001',
    'Saint-Denis',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "app_settings" WHERE "id" = 'default');

UPDATE "app_settings" SET "dispensaryId" = '00000000-0000-4000-8000-000000000001' WHERE "dispensaryId" IS NULL;

ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_pkey";
ALTER TABLE "app_settings" DROP COLUMN "id";
ALTER TABLE "app_settings" ALTER COLUMN "dispensaryId" SET NOT NULL;
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("dispensaryId");

-- Unique constraints
DROP INDEX IF EXISTS "payroll_weekly_report_weekStart_reportType_key";
CREATE UNIQUE INDEX "payroll_weekly_report_dispensaryId_weekStart_reportType_key" ON "payroll_weekly_report"("dispensaryId", "weekStart", "reportType");

DROP INDEX IF EXISTS "private_practice_week_weekStart_key";
CREATE UNIQUE INDEX "private_practice_week_dispensaryId_weekStart_key" ON "private_practice_week"("dispensaryId", "weekStart");

DROP INDEX IF EXISTS "dispensary_weekly_activity_discordUserId_periodStart_periodEnd_key";
CREATE UNIQUE INDEX "dispensary_weekly_activity_dispensaryId_discordUserId_periodStart_periodEnd_key" ON "dispensary_weekly_activity"("dispensaryId", "discordUserId", "periodStart", "periodEnd");

DROP INDEX IF EXISTS "transaction_name_suggestion_value_key";
CREATE UNIQUE INDEX "transaction_name_suggestion_dispensaryId_value_key" ON "transaction_name_suggestion"("dispensaryId", "value");

DROP INDEX IF EXISTS "transaction_description_suggestion_value_key";
CREATE UNIQUE INDEX "transaction_description_suggestion_dispensaryId_value_key" ON "transaction_description_suggestion"("dispensaryId", "value");

DROP INDEX IF EXISTS "patient_identity_suggestion_value_key";
CREATE UNIQUE INDEX "patient_identity_suggestion_dispensaryId_value_key" ON "patient_identity_suggestion"("dispensaryId", "value");

DROP INDEX IF EXISTS "order_mail_template_assignment_orderType_orderStatus_key";
CREATE UNIQUE INDEX "order_mail_template_assignment_dispensaryId_orderType_orderStatus_key" ON "order_mail_template_assignment"("dispensaryId", "orderType", "orderStatus");

-- Dispensary members from existing user roles
INSERT INTO "dispensary_member" ("id", "dispensaryId", "userId", "role", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    '00000000-0000-4000-8000-000000000001',
    u."id",
    u."role",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "user" u
WHERE u."role" IS NOT NULL
  AND u."role" <> ''
  AND u."role" <> 'admin'
  AND u."role" <> 'user'
ON CONFLICT DO NOTHING;

-- Platform admins keep User.role = admin; others become user at platform level
UPDATE "user"
SET "role" = 'user'
WHERE "role" IS NOT NULL
  AND "role" <> ''
  AND "role" <> 'admin';

-- Foreign keys
ALTER TABLE "dispensary" ADD CONSTRAINT "dispensary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dispensary_member" ADD CONSTRAINT "dispensary_member_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispensary_member" ADD CONSTRAINT "dispensary_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_item" ADD CONSTRAINT "category_item_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item" ADD CONSTRAINT "item_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chest" ADD CONSTRAINT "chest_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company" ADD CONSTRAINT "company_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_group" ADD CONSTRAINT "company_group_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "individual_customer" ADD CONSTRAINT "individual_customer_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "order_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mail_template" ADD CONSTRAINT "mail_template_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_mail_template_assignment" ADD CONSTRAINT "order_mail_template_assignment_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mail" ADD CONSTRAINT "mail_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_name_suggestion" ADD CONSTRAINT "transaction_name_suggestion_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction_description_suggestion" ADD CONSTRAINT "transaction_description_suggestion_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "patient_identity_suggestion" ADD CONSTRAINT "patient_identity_suggestion_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "private_practice_week" ADD CONSTRAINT "private_practice_week_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_weekly_report" ADD CONSTRAINT "payroll_weekly_report_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dispensary_weekly_activity" ADD CONSTRAINT "dispensary_weekly_activity_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "craft_recipe" ADD CONSTRAINT "craft_recipe_dispensaryId_fkey" FOREIGN KEY ("dispensaryId") REFERENCES "dispensary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
