-- CreateTable
CREATE TABLE "fin_wallet_allocation_reversals" (
    "id" TEXT NOT NULL,
    "walletAllocationId" TEXT NOT NULL,
    "walletTransactionId" TEXT NOT NULL,
    "amountReversed" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_allocation_reversals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fin_wallet_allocation_reversals_walletAllocationId_idx" ON "fin_wallet_allocation_reversals"("walletAllocationId");

-- CreateIndex
CREATE INDEX "fin_wallet_allocation_reversals_walletTransactionId_idx" ON "fin_wallet_allocation_reversals"("walletTransactionId");

-- AddForeignKey
ALTER TABLE "fin_wallet_allocation_reversals" ADD CONSTRAINT "fin_wallet_allocation_reversals_walletAllocationId_fkey" FOREIGN KEY ("walletAllocationId") REFERENCES "fin_wallet_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_allocation_reversals" ADD CONSTRAINT "fin_wallet_allocation_reversals_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "fin_wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;