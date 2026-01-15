/*
  Warnings:

  - You are about to drop the column `shopGroupId` on the `item` table. All the data in the column will be lost.
  - You are about to drop the `shop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shop_group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shop_group_shop` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_shopGroupId_fkey";

-- DropForeignKey
ALTER TABLE "shop" DROP CONSTRAINT "shop_locationId_fkey";

-- DropForeignKey
ALTER TABLE "shop_group_shop" DROP CONSTRAINT "shop_group_shop_shopGroupId_fkey";

-- DropForeignKey
ALTER TABLE "shop_group_shop" DROP CONSTRAINT "shop_group_shop_shopId_fkey";

-- DropIndex
DROP INDEX "item_shopGroupId_idx";

-- AlterTable
ALTER TABLE "item" DROP COLUMN "shopGroupId",
ADD COLUMN     "companyGroupId" TEXT;

-- DropTable
DROP TABLE "shop";

-- DropTable
DROP TABLE "shop_group";

-- DropTable
DROP TABLE "shop_group_shop";

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_group_company" (
    "id" TEXT NOT NULL,
    "companyGroupId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_group_company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_locationId_idx" ON "company"("locationId");

-- CreateIndex
CREATE INDEX "company_group_company_companyGroupId_idx" ON "company_group_company"("companyGroupId");

-- CreateIndex
CREATE INDEX "company_group_company_companyId_idx" ON "company_group_company"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "company_group_company_companyGroupId_companyId_key" ON "company_group_company"("companyGroupId", "companyId");

-- CreateIndex
CREATE INDEX "item_companyGroupId_idx" ON "item"("companyGroupId");

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_companyGroupId_fkey" FOREIGN KEY ("companyGroupId") REFERENCES "company_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_group_company" ADD CONSTRAINT "company_group_company_companyGroupId_fkey" FOREIGN KEY ("companyGroupId") REFERENCES "company_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_group_company" ADD CONSTRAINT "company_group_company_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
