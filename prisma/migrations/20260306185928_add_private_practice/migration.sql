-- CreateTable
CREATE TABLE "private_practice_week" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_practice_week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_practice_patient" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "description" TEXT,
    "consultationPrice" DECIMAL(10,2) NOT NULL,
    "otherPrice" DECIMAL(10,2) NOT NULL,
    "amountForCashRegister" DECIMAL(10,2) NOT NULL,
    "depositedInCashRegister" BOOLEAN NOT NULL DEFAULT false,
    "retrievedFromCashRegister" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_practice_patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_practice_week_weekStart_idx" ON "private_practice_week"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "private_practice_week_weekStart_key" ON "private_practice_week"("weekStart");

-- CreateIndex
CREATE INDEX "private_practice_patient_weekId_idx" ON "private_practice_patient"("weekId");

-- CreateIndex
CREATE INDEX "private_practice_patient_date_idx" ON "private_practice_patient"("date");

-- AddForeignKey
ALTER TABLE "private_practice_patient" ADD CONSTRAINT "private_practice_patient_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "private_practice_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;
