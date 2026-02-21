/*
  Warnings:

  - You are about to drop the column `credit` on the `bank_transaction` table. All the data in the column will be lost.
  - You are about to drop the column `debit` on the `bank_transaction` table. All the data in the column will be lost.
  - Added the required column `amount` to the `bank_transaction` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add the new amount column as nullable first
ALTER TABLE "bank_transaction" ADD COLUMN "amount" DECIMAL(10,2);

-- Step 2: Migrate existing data
-- For DEPOSIT and TRANSFER_IN: use credit value
-- For WITHDRAWAL and TRANSFER_OUT: use debit value
UPDATE "bank_transaction"
SET "amount" = CASE
  WHEN "type" IN ('DEPOSIT', 'TRANSFER_IN') THEN COALESCE("credit", 0)
  WHEN "type" IN ('WITHDRAWAL', 'TRANSFER_OUT') THEN COALESCE("debit", 0)
  ELSE 0
END;

-- Step 3: Make amount NOT NULL and drop old columns
ALTER TABLE "bank_transaction" 
  ALTER COLUMN "amount" SET NOT NULL,
  DROP COLUMN "credit",
  DROP COLUMN "debit";
