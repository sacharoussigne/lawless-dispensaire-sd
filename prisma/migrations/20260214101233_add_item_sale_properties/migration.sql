-- AlterTable
ALTER TABLE "item" ADD COLUMN     "canBeSold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" DECIMAL(10,2);
