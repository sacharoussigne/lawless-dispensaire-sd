-- AlterTable
ALTER TABLE "mail_template" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "mail_template_userId_idx" ON "mail_template"("userId");

-- AddForeignKey
ALTER TABLE "mail_template" ADD CONSTRAINT "mail_template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
