/*
  Warnings:

  - A unique constraint covering the columns `[user_id,order]` on the table `application_stages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "application_stages_user_id_order_key" ON "application_stages"("user_id", "order");
