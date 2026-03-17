-- CreateTable
CREATE TABLE "user_ui_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lowStockCraftableBg" TEXT NOT NULL DEFAULT '#fff3cd',
    "lowStockNormalBg" TEXT NOT NULL DEFAULT '#f8d7da',
    "okStockBg" TEXT,
    "unknownStockBg" TEXT,
    "doneTodayBadgeBg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ui_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_ui_preferences_userId_key" ON "user_ui_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_ui_preferences_userId_idx" ON "user_ui_preferences"("userId");

-- AddForeignKey
ALTER TABLE "user_ui_preferences" ADD CONSTRAINT "user_ui_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
