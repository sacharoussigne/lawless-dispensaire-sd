-- DropIndex
DROP INDEX IF EXISTS "company_locationId_idx";

-- AlterTable
ALTER TABLE "company" DROP COLUMN IF EXISTS "locationId";

-- DropTable
DROP TABLE IF EXISTS "location";
