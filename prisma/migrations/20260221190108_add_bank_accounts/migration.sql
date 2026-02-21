-- CreateEnum
CREATE TYPE "BankAccountAccessType" AS ENUM ('READ', 'WRITE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "bank_account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account_access" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" "BankAccountAccessType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account_week" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transaction" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "credit" DECIMAL(10,2),
    "debit" DECIMAL(10,2),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_name_suggestion" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_name_suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_description_suggestion" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_description_suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_account_ownerId_idx" ON "bank_account"("ownerId");

-- CreateIndex
CREATE INDEX "bank_account_access_accountId_idx" ON "bank_account_access"("accountId");

-- CreateIndex
CREATE INDEX "bank_account_access_userId_idx" ON "bank_account_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_access_accountId_userId_key" ON "bank_account_access"("accountId", "userId");

-- CreateIndex
CREATE INDEX "bank_account_week_accountId_idx" ON "bank_account_week"("accountId");

-- CreateIndex
CREATE INDEX "bank_account_week_weekStart_idx" ON "bank_account_week"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_week_accountId_weekStart_key" ON "bank_account_week"("accountId", "weekStart");

-- CreateIndex
CREATE INDEX "bank_transaction_weekId_idx" ON "bank_transaction"("weekId");

-- CreateIndex
CREATE INDEX "bank_transaction_date_idx" ON "bank_transaction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_name_suggestion_value_key" ON "transaction_name_suggestion"("value");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_description_suggestion_value_key" ON "transaction_description_suggestion"("value");

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_access" ADD CONSTRAINT "bank_account_access_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_access" ADD CONSTRAINT "bank_account_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_week" ADD CONSTRAINT "bank_account_week_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "bank_account_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;
