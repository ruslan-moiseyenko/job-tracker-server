/*
  Warnings:

  - You are about to drop the column `end_date` on the `job_searches` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `job_searches` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `job_searches` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "job_searches_is_active_idx";

-- DropIndex
DROP INDEX "job_searches_start_date_idx";

-- AlterTable
ALTER TABLE "job_searches" DROP COLUMN "end_date",
DROP COLUMN "is_active",
DROP COLUMN "start_date";

-- CreateIndex
CREATE INDEX "job_searches_created_at_idx" ON "job_searches"("created_at");
