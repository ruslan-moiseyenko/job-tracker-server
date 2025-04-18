-- AlterTable
ALTER TABLE "users" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "provider_id" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
