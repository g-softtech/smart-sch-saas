-- CreateTable
CREATE TABLE "idm_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isConsumed" BOOLEAN NOT NULL DEFAULT false,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idm_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idm_password_reset_tokens_tokenHash_key" ON "idm_password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "idm_password_reset_tokens_userId_idx" ON "idm_password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "idm_password_reset_tokens_tokenHash_idx" ON "idm_password_reset_tokens"("tokenHash");

-- AddForeignKey
ALTER TABLE "idm_password_reset_tokens" ADD CONSTRAINT "idm_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "idm_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
