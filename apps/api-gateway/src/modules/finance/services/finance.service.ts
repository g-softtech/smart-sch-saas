import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { kernel, Prisma } from "@saas/core-platform";
import { CreateFeeStructureDto, GenerateInvoiceDto, RecordPaymentDto, ApplyAdjustmentDto, RefundPaymentDto } from "../dto/finance.dto";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly prisma = kernel.db;
  private readonly checkPeriodStatus = async (tx: any, tenantId: string, schoolId: string, financialPeriodId?: string) => {
    if (!financialPeriodId) return;
    const period = await tx.financialPeriod.findUnique({
      where: { id: financialPeriodId, tenantId, schoolId }
    });
    if (period && period.status === 'CLOSED') {
      throw new BadRequestException("Action not permitted in a CLOSED financial period.");
    }
  }

  async createFeeStructure(tenantId: string, schoolId: string, dto: CreateFeeStructureDto) {
    return this.prisma.feeStructure.create({
      data: {
        tenantId,
        schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId,
        classId: dto.classId,
        armId: dto.armId,
        name: dto.name,
        description: dto.description,
        items: {
          create: dto.items.map(item => ({
            name: item.name,
            amount: item.amount,
            isMandatory: item.isMandatory ?? true,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async listFeeStructures(tenantId: string, schoolId: string, query: { academicYearId?: string; termId?: string }) {
    const where: any = { tenantId, schoolId };
    if (query.academicYearId) where.academicYearId = query.academicYearId;
    if (query.termId) where.termId = query.termId;

    return this.prisma.feeStructure.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generateInvoice(tenantId: string, schoolId: string, dto: GenerateInvoiceDto) {
    const totalAmount = (dto.customItems || []).reduce((sum, item) => sum + item.amount, 0);

    return this.prisma.$transaction(async (tx) => {
      await this.checkPeriodStatus(tx, tenantId, schoolId, dto.financialPeriodId);

      let itemsToCreate = dto.customItems || [];
      let baseTotal = totalAmount;

      if (dto.feeStructureId) {
        const structure = await tx.feeStructure.findUnique({
          where: { id: dto.feeStructureId, tenantId, schoolId },
          include: { items: true },
        });
        if (!structure) throw new NotFoundException("Fee structure not found");

        itemsToCreate = structure.items.map(i => ({
          name: i.name,
          amount: Number(i.amount),
          isMandatory: i.isMandatory,
        }));
        baseTotal = itemsToCreate.reduce((sum, item) => sum + item.amount, 0);
      }

      if (itemsToCreate.length === 0) {
        throw new BadRequestException("Invoice must have at least one line item");
      }

      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const invoiceNumber = `INV-${dateStr}-${randStr}`;

      return tx.invoice.create({
        data: {
          tenantId,
          schoolId,
          studentId: dto.studentId,
          academicYearId: dto.academicYearId,
          termId: dto.termId,
          feeStructureId: dto.feeStructureId,
          financialPeriodId: dto.financialPeriodId,
          invoiceNumber,
          totalAmount: baseTotal,
          dueDate: new Date(dto.dueDate),
          notes: dto.notes,
          status: 'ISSUED',
          lineItems: {
            create: itemsToCreate.map(item => ({
              name: item.name,
              amount: item.amount,
            })),
          },
        },
        include: { lineItems: true },
      });
    });
  }

  async applyAdjustment(tenantId: string, schoolId: string, dto: ApplyAdjustmentDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkPeriodStatus(tx, tenantId, schoolId, dto.financialPeriodId);

      const invoice = await tx.invoice.findUnique({
        where: { id: dto.invoiceId, tenantId, schoolId },
        include: { adjustments: true, allocations: true, walletAllocations: true }
      });
      if (!invoice) throw new NotFoundException("Invoice not found");

      const currentAdjustments = invoice.adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0);
      const newAdjustmentsTotal = currentAdjustments + dto.amount;

      if (newAdjustmentsTotal > Number(invoice.totalAmount)) {
        throw new BadRequestException("Total adjustments cannot exceed gross invoice amount");
      }

      const totalPaid = invoice.allocations.reduce((sum, a) => sum + Number(a.amountAllocated), 0) +
                        invoice.walletAllocations.reduce((sum, a) => sum + Number(a.amountAllocated), 0);

      const netAmount = Number(invoice.totalAmount) - newAdjustmentsTotal;

      if (totalPaid > netAmount) {
        throw new BadRequestException("Adjustment would cause net amount to fall below already paid amount.");
      }

      const adjustment = await tx.financialAdjustment.create({
        data: {
          tenantId,
          schoolId,
          invoiceId: invoice.id,
          financialPeriodId: dto.financialPeriodId,
          type: dto.type,
          amount: dto.amount,
          reason: dto.reason
        }
      });

      const newStatus = totalPaid >= netAmount ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'ISSUED');

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus }
      });

      return adjustment;
    });
  }

  async allocateWallet(tenantId: string, schoolId: string, financialAccountId: string, invoiceId: string, amount: number, financialPeriodId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkPeriodStatus(tx, tenantId, schoolId, financialPeriodId);

      const wallet = await tx.wallet.findUnique({ where: { financialAccountId } });
      if (!wallet) throw new BadRequestException("Wallet not found");

      // Concurrency lock
      const lockedWallet = await tx.$queryRaw<any[]>`SELECT id, "cachedBalance" FROM fin_wallets WHERE id = ${wallet.id} FOR UPDATE`;

      if (Number(lockedWallet[0].cachedBalance) < amount) {
        throw new BadRequestException("Insufficient wallet balance");
      }

      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId, tenantId, schoolId }, include: { adjustments: true, allocations: true, walletAllocations: true }});
      if (!invoice) throw new NotFoundException("Invoice not found");

      const adjs = invoice.adjustments.reduce((s, a) => s + Number(a.amount), 0);
      const paid = invoice.allocations.reduce((s, a) => s + Number(a.amountAllocated), 0) + invoice.walletAllocations.reduce((s, a) => s + Number(a.amountAllocated), 0);
      const outstanding = Number(invoice.totalAmount) - adjs - paid;

      if (amount > outstanding) throw new BadRequestException("Allocation amount exceeds outstanding balance");

      const walletTx = await tx.walletTransaction.create({
        data: {
          tenantId,
          schoolId,
          walletId: wallet.id,
          financialPeriodId,
          type: 'DEBIT',
          amount,
          reference: 'WDEBIT-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          reason: 'Wallet Allocation to Invoice ' + invoice.invoiceNumber,
        }
      });

      await tx.walletAllocation.create({
        data: {
          walletTransactionId: walletTx.id,
          invoiceId: invoice.id,
          financialPeriodId,
          amountAllocated: amount
        }
      });

      await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: { decrement: amount } }});

      const newPaid = paid + amount;
      const newStatus = newPaid >= (Number(invoice.totalAmount) - adjs) ? 'PAID' : 'PARTIAL';
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: newStatus, paidAmount: newPaid }}); 

      return walletTx;
    });
  }

  async recordPayment(tenantId: string, schoolId: string, dto: RecordPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkPeriodStatus(tx, tenantId, schoolId, dto.financialPeriodId);

      const existing = await tx.payment.findUnique({
        where: { tenantId_reference: { tenantId, reference: dto.reference } },
      });
      if (existing) throw new ConflictException("Payment reference already exists");

      let invoicesToPay = [];
      let totalOutstanding = 0;
      if (dto.invoiceIds && dto.invoiceIds.length > 0) {
        invoicesToPay = await tx.invoice.findMany({
          where: { id: { in: dto.invoiceIds }, tenantId, schoolId, studentId: dto.studentId },
          include: { adjustments: true, allocations: true, walletAllocations: true }
        });

        if (invoicesToPay.length !== dto.invoiceIds.length) {
          throw new BadRequestException("One or more invoices not found or belong to a different student");
        }

        totalOutstanding = invoicesToPay.reduce((sum, inv) => {
          const adjs = inv.adjustments.reduce((s, a) => s + Number(a.amount), 0);
          const paid = inv.allocations.reduce((s, a) => s + Number(a.amountAllocated), 0) +
                       inv.walletAllocations.reduce((s, a) => s + Number(a.amountAllocated), 0);
          return sum + (Number(inv.totalAmount) - adjs - paid);
        }, 0);
      }

      const allocatedToInvoices = Math.min(dto.amount, totalOutstanding);
      const overpaymentAmount = dto.amount - allocatedToInvoices;

      if (overpaymentAmount > 0 && !dto.financialAccountId) {
        throw new BadRequestException("Overpayment detected but no financialAccountId provided to credit the wallet.");
      }

      const payment = await tx.payment.create({
        data: {
          tenantId,
          schoolId,
          studentId: dto.studentId,
          financialAccountId: dto.financialAccountId,
          financialPeriodId: dto.financialPeriodId,
          reference: dto.reference,
          amount: dto.amount,
          method: dto.method,
          status: 'SUCCESS',
          notes: dto.notes,
        },
      });

      const allocations = [];
      let remainingToAllocate = allocatedToInvoices;

      for (const inv of invoicesToPay) {
        if (remainingToAllocate <= 0) break;
        
        const adjs = inv.adjustments.reduce((s, a) => s + Number(a.amount), 0);
        const paid = inv.allocations.reduce((s, a) => s + Number(a.amountAllocated), 0) +
                     inv.walletAllocations.reduce((s, a) => s + Number(a.amountAllocated), 0);
        
        const outstanding = Number(inv.totalAmount) - adjs - paid;
        if (outstanding <= 0) continue;

        const allocated = Math.min(outstanding, remainingToAllocate);
        remainingToAllocate -= allocated;

        allocations.push({
          paymentId: payment.id,
          invoiceId: inv.id,
          financialPeriodId: dto.financialPeriodId,
          amountAllocated: allocated,
        });

        const newPaid = paid + allocated;
        const newStatus = newPaid >= (Number(inv.totalAmount) - adjs) ? 'PAID' : 'PARTIAL';

        await tx.invoice.update({
          where: { id: inv.id },
          data: { status: newStatus, paidAmount: newPaid }, 
        });
      }

      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({ data: allocations });
      }

      let walletTx = null;
      if (overpaymentAmount > 0 && dto.financialAccountId) {
        let wallet = await tx.wallet.findUnique({
          where: { financialAccountId: dto.financialAccountId }
        });
        
        if (!wallet) {
          const acc = await tx.financialAccount.findUnique({ where: { id: dto.financialAccountId, tenantId, schoolId }});
          if (!acc) throw new BadRequestException("Invalid FinancialAccount");
          
          wallet = await tx.wallet.create({
            data: { tenantId, schoolId, financialAccountId: dto.financialAccountId, cachedBalance: 0 }
          });
        }

        walletTx = await tx.walletTransaction.create({
          data: {
            tenantId,
            schoolId,
            walletId: wallet.id,
            financialPeriodId: dto.financialPeriodId,
            type: 'CREDIT',
            amount: overpaymentAmount,
            reference: 'CREDIT-' + payment.id,
            reason: 'Overpayment from reference ' + dto.reference,
            sourcePaymentId: payment.id
          }
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cachedBalance: { increment: overpaymentAmount } }
        });
      }

      const receipt = await tx.paymentReceipt.create({
        data: {
          tenantId,
          schoolId,
          studentId: dto.studentId,
          paymentId: payment.id,
          receiptNumber: 'RCT-' + new Date().toISOString().slice(0, 7).replace('-', '') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          amountReceived: dto.amount,
        },
      });

      return { payment, receipt, allocationsCount: allocations.length, walletTransaction: walletTx };
    });
  }

  async refundPayment(tenantId: string, schoolId: string, dto: RefundPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkPeriodStatus(tx, tenantId, schoolId, dto.financialPeriodId);

      const payment = await tx.payment.findUnique({
        where: { id: dto.paymentId, tenantId, schoolId },
        include: { refunds: true }
      });
      if (!payment) throw new NotFoundException("Payment not found");

      const totalRefunded = payment.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
      if (totalRefunded + dto.amount > Number(payment.amount)) {
        throw new BadRequestException("Refund amount exceeds refundable balance of this payment");
      }

      const refund = await tx.refund.create({
        data: {
          tenantId,
          schoolId,
          paymentId: payment.id,
          financialPeriodId: dto.financialPeriodId,
          amount: dto.amount,
          reason: dto.reason,
          refundMethod: dto.refundMethod
        }
      });

      if (dto.refundMethod === 'WALLET_CREDIT') {
        if (!payment.financialAccountId) {
          throw new BadRequestException("Cannot refund to wallet: original payment has no financialAccountId");
        }
        let wallet = await tx.wallet.findUnique({ where: { financialAccountId: payment.financialAccountId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { tenantId, schoolId, financialAccountId: payment.financialAccountId, cachedBalance: 0 }});
        }
        await tx.walletTransaction.create({
          data: {
            tenantId,
            schoolId,
            walletId: wallet.id,
            financialPeriodId: dto.financialPeriodId,
            type: 'CREDIT',
            amount: dto.amount,
            reference: 'REFUND-CREDIT-' + refund.id,
            reason: 'Refund wallet credit for ' + dto.reason,
            sourceRefundId: refund.id
          }
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cachedBalance: { increment: dto.amount } }
        });
      }

      return refund;
    });
  }

  async listInvoices(tenantId: string, schoolId: string, studentId?: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        schoolId,
        ...(studentId && { studentId }),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true }
        },
        academicYear: true,
        term: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoice(tenantId: string, schoolId: string, id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id, tenantId, schoolId },
      include: { lineItems: true, allocations: { include: { payment: true } }, walletAllocations: true, adjustments: true },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async getReceipt(tenantId: string, schoolId: string, id: string) {
    const receipt = await this.prisma.paymentReceipt.findUnique({
      where: { id, tenantId, schoolId },
      include: {
        payment: { include: { allocations: { include: { invoice: true } } } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!receipt) throw new NotFoundException("Receipt not found");
    return receipt;
  }

  async listPayments(tenantId: string, schoolId: string, studentId?: string) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        schoolId,
        ...(studentId && { studentId }),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        receipt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
