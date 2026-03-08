-- AlterTable
ALTER TABLE "mail_template" RENAME CONSTRAINT "letter_template_pkey" TO "mail_template_pkey";

-- AlterTable
ALTER TABLE "order_mail_template_assignment" RENAME CONSTRAINT "order_letter_template_assignment_pkey" TO "order_mail_template_assignment_pkey";

-- CreateTable
CREATE TABLE "mail" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mail_senderId_idx" ON "mail"("senderId");

-- CreateIndex
CREATE INDEX "mail_createdAt_idx" ON "mail"("createdAt");

-- RenameForeignKey
ALTER TABLE "order_mail_template_assignment" RENAME CONSTRAINT "order_letter_template_assignment_letterTemplateId_fkey" TO "order_mail_template_assignment_mailTemplateId_fkey";

-- AddForeignKey
ALTER TABLE "mail" ADD CONSTRAINT "mail_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "order_letter_template_assignment_letterTemplateId_idx" RENAME TO "order_mail_template_assignment_mailTemplateId_idx";

-- RenameIndex
ALTER INDEX "order_letter_template_assignment_orderType_orderStatus_idx" RENAME TO "order_mail_template_assignment_orderType_orderStatus_idx";

-- RenameIndex
ALTER INDEX "order_letter_template_assignment_orderType_orderStatus_key" RENAME TO "order_mail_template_assignment_orderType_orderStatus_key";
