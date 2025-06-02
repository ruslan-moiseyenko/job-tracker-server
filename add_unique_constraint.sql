-- CreateUnique
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_user_id_order_key" UNIQUE("user_id", "order");
