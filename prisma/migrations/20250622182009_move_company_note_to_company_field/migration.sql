/*
  Warnings:

  - You are about to drop the `company_notes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "company_notes" DROP CONSTRAINT "company_notes_company_id_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "company_note" TEXT;

-- DropTable
DROP TABLE "company_notes";
