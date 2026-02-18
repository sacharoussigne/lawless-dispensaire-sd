-- CreateTable
CREATE TABLE "chest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chest_pkey" PRIMARY KEY ("id")
);

-- AddColumn: Ajouter chestId à stock_history (temporairement nullable)
ALTER TABLE "stock_history" ADD COLUMN "chestId" TEXT;

-- Créer le coffre "foure tout" pour la migration
-- Utilisation d'un UUID fixe pour garantir la reproductibilité
INSERT INTO "chest" ("id", "name", "description", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Foure tout', 'Coffre par défaut pour les stocks existants', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Mettre à jour tous les stocks existants pour les lier au coffre "foure tout"
UPDATE "stock_history"
SET "chestId" = (SELECT "id" FROM "chest" WHERE "name" = 'Foure tout' LIMIT 1)
WHERE "chestId" IS NULL;

-- Rendre chestId non-nullable
ALTER TABLE "stock_history" ALTER COLUMN "chestId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_chestId_fkey" FOREIGN KEY ("chestId") REFERENCES "chest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "stock_history_chestId_idx" ON "stock_history"("chestId");
