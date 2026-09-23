import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "@saas/core-platform";
import { CreateFeeStructureDto, GenerateInvoiceDto, RecordPaymentDto } from "../dto/finance.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      // Basic generating logic
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

      // Generate sequence
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM
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
          invoiceNumber,
          totalAmount: baseTotal,
          dueDate: new Date(dto.dueDate),
          notes: dto.notes,
          status: 'ISSUED', // Skip DRAFT for now
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

  async listInvoices(tenantId: string, schoolId: string, studentId?: string) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        schoolId,
        ...(studentId && { studentId }),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, admissionNumber: true }
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
      include: { lineItems: true, allocations: { include: { payment: true } } },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async recordPayment(tenantId: string, schoolId: string, dto: RecordPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // Idempotency check
      const existing = await tx.payment.findUnique({
        where: { tenantId_reference: { tenantId, reference: dto.reference } },
      });
      if (existing) {
        throw new ConflictException("Payment reference already exists");
      }

      // Validate invoices if any
      let invoicesToPay = [];
      if (dto.invoiceIds && dto.invoiceIds.length > 0) {
        invoicesToPay = await tx.invoice.findMany({
          where: {
            id: { in: dto.invoiceIds },
            tenantId,
            schoolId,
            studentId: dto.studentId,
          },
        });

        if (invoicesToPay.length !== dto.invoiceIds.length) {
          throw new BadRequestException("One or more invoices not found or belong to a different student");
        }

        const totalOutstanding = invoicesToPay.reduce((sum, inv) => {
          return sum + (Number(inv.totalAmount) - Number(inv.paidAmount));
        }, 0);

        if (dto.amount > totalOutstanding) {
          throw new BadRequestException("Payment amount exceeds outstanding balance on selected invoices");
        }
      }

      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          tenantId,
          schoolId,
          studentId: dto.studentId,
          reference: dto.reference,
          amount: dto.amount,
          method: dto.method,
          status: 'COMPLETED',
          notes: dto.notes,
        },
      });

      // 2. Allocate and update invoices
      let remainingAmount = dto.amount;
      const allocations = [];

      for (const inv of invoicesToPay) {
        if (remainingAmount <= 0) break;
        
        const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);
        if (outstanding <= 0) continue;

        const allocated = Math.min(outstanding, remainingAmount);
        remainingAmount -= allocated;

        // Create allocation
        allocations.push({
          paymentId: payment.id,
          invoiceId: inv.id,
          amountAllocated: allocated,
        });

        // Update invoice
        const newPaidAmount = Number(inv.paidAmount) + allocated;
        const newStatus = newPaidAmount >= Number(inv.totalAmount) ? 'PAID' : 'PARTIAL';

        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });
      }

      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({ data: allocations });
      }

      // 3. Generate Auto-Receipt
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const randStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      const receiptNumber = `RCT-${dateStr}-${randStr}`;

      const receipt = await tx.paymentReceipt.create({
        data: {
          tenantId,
          schoolId,
          studentId: dto.studentId,
          paymentId: payment.id,
          receiptNumber,
          amountReceived: dto.amount,
        },
      });

      return {
        payment,
        receipt,
        allocationsCount: allocations.length,
      };
    });
  }

  async getReceipt(tenantId: string, schoolId: string, id: string) {
    const receipt = await this.prisma.paymentReceipt.findUnique({
      where: { id, tenantId, schoolId },
      include: {
        payment: { include: { allocations: { include: { invoice: true } } } },
        student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
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
