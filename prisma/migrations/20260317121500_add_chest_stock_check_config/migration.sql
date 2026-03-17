-- Add per-chest stock check configuration
CREATE TABLE "chest_stock_check_config" (
  "id" TEXT NOT NULL,
  "chestId" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "chest_stock_check_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chest_stock_check_config_chestId_key" ON "chest_stock_check_config"("chestId");
CREATE INDEX "chest_stock_check_config_chestId_idx" ON "chest_stock_check_config"("chestId");

ALTER TABLE "chest_stock_check_config"
  ADD CONSTRAINT "chest_stock_check_config_chestId_fkey"
  FOREIGN KEY ("chestId") REFERENCES "chest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "chest_stock_check_category" (
  "id" TEXT NOT NULL,
  "configId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "chest_stock_check_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chest_stock_check_category_configId_categoryId_key" ON "chest_stock_check_category"("configId", "categoryId");
CREATE INDEX "chest_stock_check_category_configId_idx" ON "chest_stock_check_category"("configId");
CREATE INDEX "chest_stock_check_category_categoryId_idx" ON "chest_stock_check_category"("categoryId");

ALTER TABLE "chest_stock_check_category"
  ADD CONSTRAINT "chest_stock_check_category_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "chest_stock_check_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chest_stock_check_category"
  ADD CONSTRAINT "chest_stock_check_category_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "category_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

