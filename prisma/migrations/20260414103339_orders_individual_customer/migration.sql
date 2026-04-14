-- AlterTable
ALTER TABLE "order" ADD COLUMN     "companyGroupId" TEXT,
ADD COLUMN     "individualCustomerId" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "individual_customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_companyGroupId_idx" ON "order"("companyGroupId");

-- CreateIndex
CREATE INDEX "order_individualCustomerId_idx" ON "order"("individualCustomerId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_companyGroupId_fkey" FOREIGN KEY ("companyGroupId") REFERENCES "company_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_individualCustomerId_fkey" FOREIGN KEY ("individualCustomerId") REFERENCES "individual_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill catalog group from first order line item (when item has a company group)
UPDATE "order" o
SET "companyGroupId" = sub."companyGroupId"
FROM (
  SELECT DISTINCT ON (oi."orderId")
    oi."orderId",
    i."companyGroupId" AS "companyGroupId"
  FROM "order_item" oi
  INNER JOIN "item" i ON i.id = oi."itemId"
  WHERE i."companyGroupId" IS NOT NULL
  ORDER BY oi."orderId", oi."createdAt" ASC
) AS sub
WHERE o.id = sub."orderId"
  AND o."companyGroupId" IS NULL;
