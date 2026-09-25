CREATE TABLE "fin_financial_adjustments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "type" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_financial_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fin_wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "cachedBalance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fin_wallet_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "reason" TEXT,
    "sourcePaymentId" TEXT,
    "sourceRefundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fin_wallet_allocations" (
    "id" TEXT NOT NULL,
    "walletTransactionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "amountAllocated" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fin_refunds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "refundMethod" "RefundMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_refunds_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "fin_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "fin_wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fin_wallets" ADD CONSTRAINT "fin_wallets_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "fin_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "fin_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "fin_wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "fin_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fin_financial_adjustments_tenantId_schoolId_invoiceId_idx" ON "fin_financial_adjustments"("tenantId", "schoolId", "invoiceId");

CREATE UNIQUE INDEX "fin_wallets_financialAccountId_key" ON "fin_wallets"("financialAccountId");

CREATE INDEX "fin_wallets_tenantId_schoolId_idx" ON "fin_wallets"("tenantId", "schoolId");

CREATE INDEX "fin_wallet_transactions_tenantId_schoolId_walletId_idx" ON "fin_wallet_transactions"("tenantId", "schoolId", "walletId");

CREATE UNIQUE INDEX "fin_wallet_transactions_tenantId_reference_key" ON "fin_wallet_transactions"("tenantId", "reference");

CREATE INDEX "fin_wallet_allocations_walletTransactionId_idx" ON "fin_wallet_allocations"("walletTransactionId");

CREATE INDEX "fin_wallet_allocations_invoiceId_idx" ON "fin_wallet_allocations"("invoiceId");

CREATE INDEX "fin_refunds_tenantId_schoolId_paymentId_idx" ON "fin_refunds"("tenantId", "schoolId", "paymentId");

