-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('MANUAL_FIRST_COUNT', 'MANUAL_ADJUST', 'CRAFT_CONSUME', 'CRAFT_PRODUCE');

-- CreateTable
CREATE TABLE "stock_item_movement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_item_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_item_movement_itemId_createdAt_idx" ON "stock_item_movement"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_item_movement_createdAt_idx" ON "stock_item_movement"("createdAt");

-- AddForeignKey
ALTER TABLE "stock_item_movement" ADD CONSTRAINT "stock_item_movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item_movement" ADD CONSTRAINT "stock_item_movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
