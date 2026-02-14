-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('INCOMING', 'OUTGOING');

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "type" "OrderType" NOT NULL DEFAULT 'INCOMING';

-- CreateIndex
CREATE INDEX "order_type_idx" ON "order"("type");
