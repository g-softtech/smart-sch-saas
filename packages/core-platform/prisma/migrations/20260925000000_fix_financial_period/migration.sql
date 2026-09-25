-- ============================================================
-- Fix migration: Apply the phase4_finance_hardening changes
-- that were missing from the remote database because the
-- original 20260923210000_phase4_finance_hardening migration
-- file was empty.
-- ============================================================

-- CreateEnum (missing from remote DB)
CREATE TYPE "FinancialPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('SCHOLARSHIP', 'DISCOUNT', 'WAIVER');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_GATEWAY', 'WALLET_CREDIT');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable: fin_financial_periods
CREATE TABLE "fin_financial_periods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "status" "FinancialPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_financial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fin_financial_accounts
CREATE TABLE "fin_financial_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "guardianId" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fin_financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fin_wallets
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

-- CreateTable: fin_wallet_transactions
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

-- CreateTable: fin_wallet_allocations
CREATE TABLE "fin_wallet_allocations" (
    "id" TEXT NOT NULL,
    "walletTransactionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "financialPeriodId" TEXT,
    "amountAllocated" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_wallet_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: fin_financial_adjustments
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

-- CreateTable: fin_refunds
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

-- AlterTable: add financialPeriodId to existing tables
ALTER TABLE "fin_invoices" ADD COLUMN "financialPeriodId" TEXT;
ALTER TABLE "fin_payments" ADD COLUMN "financialPeriodId" TEXT;
ALTER TABLE "fin_payment_allocations" ADD COLUMN "financialPeriodId" TEXT;

-- CreateIndex: fin_financial_periods
CREATE INDEX "fin_financial_periods_tenantId_schoolId_idx" ON "fin_financial_periods"("tenantId", "schoolId");
CREATE UNIQUE INDEX "fin_financial_periods_tenantId_schoolId_name_key" ON "fin_financial_periods"("tenantId", "schoolId", "name");

-- CreateIndex: fin_financial_accounts
CREATE INDEX "fin_financial_accounts_tenantId_schoolId_idx" ON "fin_financial_accounts"("tenantId", "schoolId");
CREATE UNIQUE INDEX "fin_financial_accounts_tenantId_schoolId_guardianId_student_key" ON "fin_financial_accounts"("tenantId", "schoolId", "guardianId", "studentId");

-- CreateIndex: fin_wallets
CREATE UNIQUE INDEX "fin_wallets_financialAccountId_key" ON "fin_wallets"("financialAccountId");
CREATE INDEX "fin_wallets_tenantId_schoolId_idx" ON "fin_wallets"("tenantId", "schoolId");

-- CreateIndex: fin_wallet_transactions
CREATE INDEX "fin_wallet_transactions_tenantId_schoolId_walletId_idx" ON "fin_wallet_transactions"("tenantId", "schoolId", "walletId");
CREATE UNIQUE INDEX "fin_wallet_transactions_tenantId_reference_key" ON "fin_wallet_transactions"("tenantId", "reference");

-- CreateIndex: fin_wallet_allocations
CREATE INDEX "fin_wallet_allocations_walletTransactionId_idx" ON "fin_wallet_allocations"("walletTransactionId");
CREATE INDEX "fin_wallet_allocations_invoiceId_idx" ON "fin_wallet_allocations"("invoiceId");

-- CreateIndex: fin_financial_adjustments
CREATE INDEX "fin_financial_adjustments_tenantId_schoolId_invoiceId_idx" ON "fin_financial_adjustments"("tenantId", "schoolId", "invoiceId");

-- CreateIndex: fin_refunds
CREATE INDEX "fin_refunds_tenantId_schoolId_paymentId_idx" ON "fin_refunds"("tenantId", "schoolId", "paymentId");

-- AddForeignKey: fin_financial_periods
ALTER TABLE "fin_financial_periods" ADD CONSTRAINT "fin_financial_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fin_financial_periods" ADD CONSTRAINT "fin_financial_periods_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: fin_financial_accounts
ALTER TABLE "fin_financial_accounts" ADD CONSTRAINT "fin_financial_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fin_financial_accounts" ADD CONSTRAINT "fin_financial_accounts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: fin_wallets
ALTER TABLE "fin_wallets" ADD CONSTRAINT "fin_wallets_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "fin_financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: fin_wallet_transactions
ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "fin_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: fin_wallet_allocations
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_walletTransactionId_fkey" FOREIGN KEY ("walletTransactionId") REFERENCES "fin_wallet_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: fin_financial_adjustments
ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "fin_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: fin_refunds
ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "fin_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: existing tables -> fin_financial_periods
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_financial_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
