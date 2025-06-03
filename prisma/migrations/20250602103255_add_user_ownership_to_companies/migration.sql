/*
  Warnings:

  - A unique constraint covering the columns `[user_id,name]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `companies` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "companies_name_key";

-- First, add the column as nullable
ALTER TABLE "companies" ADD COLUMN "user_id" TEXT;

-- Assign all existing companies to the first user (for migration purposes)
UPDATE "companies" 
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1)
WHERE "user_id" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "companies" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "companies_user_id_idx" ON "companies"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_user_id_name_key" ON "companies"("user_id", "name");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
