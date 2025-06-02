/*
  Warnings:

  - You are about to drop the column `industry` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `final_status_id` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated` on the `job_applications` table. All the data in the column will be lost.
  - You are about to drop the `application_statuses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "application_statuses" DROP CONSTRAINT "application_statuses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "job_applications" DROP CONSTRAINT "job_applications_final_status_id_fkey";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "industry";

-- AlterTable
ALTER TABLE "job_applications" DROP COLUMN "final_status_id",
DROP COLUMN "last_updated",
ADD COLUMN     "salary" INTEGER;

-- DropTable
DROP TABLE "application_statuses";
