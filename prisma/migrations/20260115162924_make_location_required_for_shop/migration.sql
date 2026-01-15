/*
  Warnings:

  - Made the column `locationId` on table `shop` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "shop" DROP CONSTRAINT "shop_locationId_fkey";

-- AlterTable
ALTER TABLE "shop" ALTER COLUMN "locationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "shop" ADD CONSTRAINT "shop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
