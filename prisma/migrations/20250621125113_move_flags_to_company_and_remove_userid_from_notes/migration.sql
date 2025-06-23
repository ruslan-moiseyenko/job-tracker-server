/*
  Warnings:

  - You are about to drop the column `is_blacklisted` on the `company_notes` table. All the data in the column will be lost.
  - You are about to drop the column `is_favorite` on the `company_notes` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `company_notes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "company_notes" DROP CONSTRAINT "company_notes_user_id_fkey";

-- DropIndex
DROP INDEX "company_notes_company_id_user_id_key";

-- DropIndex
DROP INDEX "company_notes_is_blacklisted_idx";

-- DropIndex
DROP INDEX "company_notes_is_favorite_idx";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "company_notes" DROP COLUMN "is_blacklisted",
DROP COLUMN "is_favorite",
DROP COLUMN "user_id",
ALTER COLUMN "content" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "companies_user_id_is_favorite_idx" ON "companies"("user_id", "is_favorite");

-- CreateIndex
CREATE INDEX "companies_user_id_is_blacklisted_idx" ON "companies"("user_id", "is_blacklisted");

-- CreateIndex
CREATE INDEX "company_notes_company_id_idx" ON "company_notes"("company_id");
