-- AlterTable
ALTER TABLE "item" ADD COLUMN     "itemTypeId" TEXT;

-- CreateTable
CREATE TABLE "item_type" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_type_shop" (
    "id" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_type_shop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_type_shop_itemTypeId_idx" ON "item_type_shop"("itemTypeId");

-- CreateIndex
CREATE INDEX "item_type_shop_shopId_idx" ON "item_type_shop"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "item_type_shop_itemTypeId_shopId_key" ON "item_type_shop"("itemTypeId", "shopId");

-- CreateIndex
CREATE INDEX "item_itemTypeId_idx" ON "item"("itemTypeId");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_shop" ADD CONSTRAINT "item_type_shop_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_type_shop" ADD CONSTRAINT "item_type_shop_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
