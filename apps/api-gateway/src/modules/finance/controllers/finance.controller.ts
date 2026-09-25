import { Controller, Get, Post, Body, Param, Query, UseGuards, UseInterceptors, Req, BadRequestException } from "@nestjs/common";
import { FinanceService } from "../services/finance.service";
import { CreateFeeStructureDto, GenerateInvoiceDto, RecordPaymentDto } from "../dto/finance.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";

@Controller("api/v1/finance")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Post("fee-structures")
  async createFeeStructure(@Body() dto: CreateFeeStructureDto, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.createFeeStructure(tenantId, schoolId, dto);
    return { success: true, data: result };
  }

  @Get("fee-structures")
  async listFeeStructures(@Query() query: any, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.listFeeStructures(tenantId, schoolId, query);
    return { success: true, data: result };
  }

  @Post("invoices")
  async generateInvoice(@Body() dto: GenerateInvoiceDto, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.generateInvoice(tenantId, schoolId, dto);
    return { success: true, data: result };
  }

  @Get("invoices")
  async listInvoices(@Query("studentId") studentId: string, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    try {
      const result = await this.service.listInvoices(tenantId, schoolId, studentId);
      return { success: true, data: result };
    } catch (error: any) {
      throw new BadRequestException(`Failed to list invoices: ${error.message}`);
    }
  }

  @Get("invoices/:id")
  async getInvoice(@Param("id") id: string, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.getInvoice(tenantId, schoolId, id);
    return { success: true, data: result };
  }

  @Post("payments/record")
  async recordPayment(@Body() dto: RecordPaymentDto, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.recordPayment(tenantId, schoolId, dto);
    return { success: true, data: result };
  }

  @Get("payments")
  async listPayments(@Query("studentId") studentId: string, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.listPayments(tenantId, schoolId, studentId);
    return { success: true, data: result };
  }

  @Get("receipts/:id")
  async getReceipt(@Param("id") id: string, @Req() req: any) {
    const schoolId = req.workspace?.schoolId;
    const tenantId = req.workspace?.tenantId;
    if (!schoolId || !tenantId) throw new BadRequestException("Workspace context missing");

    const result = await this.service.getReceipt(tenantId, schoolId, id);
    return { success: true, data: result };
  }
}
