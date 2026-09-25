-- AlterTable
ALTER TABLE "fin_financial_adjustments" ADD COLUMN     "financialPeriodId" TEXT;

-- AlterTable
ALTER TABLE "fin_invoices" ADD COLUMN     "financialPeriodId" TEXT;

-- AlterTable
ALTER TABLE "fin_payment_allocations" ADD COLUMN     "financialPeriodId" TEXT;

-- AlterTable
ALTER TABLE "fin_payments" ADD COLUMN     "financialPeriodId" TEXT;

-- AlterTable
ALTER TABLE "fin_refunds" ADD COLUMN     "financialPeriodId" TEXT;

-- AlterTable
ALTER TABLE "fin_wallet_allocations" ADD COLUMN     "financialPeriodId" TEXT;

-- AlterTable
ALTER TABLE "fin_wallet_transactions" ADD COLUMN     "financialPeriodId" TEXT;

-- AddForeignKey
ALTER TABLE "fin_invoices" ADD CONSTRAINT "fin_invoices_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payments" ADD CONSTRAINT "fin_payments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_transactions" ADD CONSTRAINT "fin_wallet_transactions_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_wallet_allocations" ADD CONSTRAINT "fin_wallet_allocations_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_financial_adjustments" ADD CONSTRAINT "fin_financial_adjustments_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fin_refunds" ADD CONSTRAINT "fin_refunds_financialPeriodId_fkey" FOREIGN KEY ("financialPeriodId") REFERENCES "fin_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
