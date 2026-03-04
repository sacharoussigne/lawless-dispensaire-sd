/*
  Warnings:

  - You are about to drop the column `locationId` on the `company` table. All the data in the column will be lost.
  - You are about to drop the `location` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "company" DROP CONSTRAINT "company_locationId_fkey";

-- DropIndex
DROP INDEX "company_locationId_idx";

-- AlterTable
ALTER TABLE "company" DROP COLUMN "locationId";

-- DropTable
DROP TABLE "location";
