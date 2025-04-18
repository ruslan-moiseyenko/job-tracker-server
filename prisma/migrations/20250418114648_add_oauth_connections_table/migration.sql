-- CreateTable
CREATE TABLE "user_oauth_connections" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userData" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_oauth_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_oauth_connections_user_id_idx" ON "user_oauth_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_oauth_connections_provider_providerId_key" ON "user_oauth_connections"("provider", "providerId");

-- AddForeignKey
ALTER TABLE "user_oauth_connections" ADD CONSTRAINT "user_oauth_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
