-- CreateTable
CREATE TABLE "category_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "idealQuantity" INTEGER NOT NULL,
    "isCraftable" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_history" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "craft_recipe" (
    "id" TEXT NOT NULL,
    "craftedItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "craft_recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "craft_recipe_item" (
    "id" TEXT NOT NULL,
    "craftRecipeId" TEXT NOT NULL,
    "usedItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "craft_recipe_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_categoryId_idx" ON "item"("categoryId");

-- CreateIndex
CREATE INDEX "stock_history_itemId_idx" ON "stock_history"("itemId");

-- CreateIndex
CREATE INDEX "stock_history_timestamp_idx" ON "stock_history"("timestamp");

-- CreateIndex
CREATE INDEX "shop_locationId_idx" ON "shop"("locationId");

-- CreateIndex
CREATE INDEX "craft_recipe_craftedItemId_idx" ON "craft_recipe"("craftedItemId");

-- CreateIndex
CREATE INDEX "craft_recipe_item_craftRecipeId_idx" ON "craft_recipe_item"("craftRecipeId");

-- CreateIndex
CREATE INDEX "craft_recipe_item_usedItemId_idx" ON "craft_recipe_item"("usedItemId");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop" ADD CONSTRAINT "shop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craft_recipe" ADD CONSTRAINT "craft_recipe_craftedItemId_fkey" FOREIGN KEY ("craftedItemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craft_recipe_item" ADD CONSTRAINT "craft_recipe_item_craftRecipeId_fkey" FOREIGN KEY ("craftRecipeId") REFERENCES "craft_recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craft_recipe_item" ADD CONSTRAINT "craft_recipe_item_usedItemId_fkey" FOREIGN KEY ("usedItemId") REFERENCES "item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
