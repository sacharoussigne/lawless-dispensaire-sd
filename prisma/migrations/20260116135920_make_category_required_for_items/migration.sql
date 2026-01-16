/*
  Warnings:

  - Made the column `categoryId` on table `item` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "item" DROP CONSTRAINT "item_categoryId_fkey";

-- AlterTable
ALTER TABLE "item" ALTER COLUMN "categoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "item" ADD CONSTRAINT "item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
