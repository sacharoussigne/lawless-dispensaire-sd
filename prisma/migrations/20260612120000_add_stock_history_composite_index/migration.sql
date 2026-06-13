-- CreateIndex
CREATE INDEX "stock_history_itemId_chestId_timestamp_idx" ON "stock_history"("itemId", "chestId", "timestamp");
