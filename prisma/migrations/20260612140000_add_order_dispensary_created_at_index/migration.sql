-- CreateIndex
CREATE INDEX "Order_dispensaryId_createdAt_idx" ON "order"("dispensaryId", "createdAt" DESC);
