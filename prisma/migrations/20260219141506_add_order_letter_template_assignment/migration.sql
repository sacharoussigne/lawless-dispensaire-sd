-- CreateTable
CREATE TABLE "order_letter_template_assignment" (
    "id" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "orderStatus" "OrderStatus" NOT NULL,
    "letterTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_letter_template_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_letter_template_assignment_letterTemplateId_idx" ON "order_letter_template_assignment"("letterTemplateId");

-- CreateIndex
CREATE INDEX "order_letter_template_assignment_orderType_orderStatus_idx" ON "order_letter_template_assignment"("orderType", "orderStatus");

-- CreateIndex
CREATE UNIQUE INDEX "order_letter_template_assignment_orderType_orderStatus_key" ON "order_letter_template_assignment"("orderType", "orderStatus");

-- AddForeignKey
ALTER TABLE "order_letter_template_assignment" ADD CONSTRAINT "order_letter_template_assignment_letterTemplateId_fkey" FOREIGN KEY ("letterTemplateId") REFERENCES "letter_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
