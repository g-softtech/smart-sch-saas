import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { ParentPortalService } from "../services/parent-portal.service";
import { CreateParentPickupAuthorizationDto, PayInvoiceDto } from "../dto/parent-portal.dto";

@Controller(["api/v1/portal/parent", "v1/portal/parent"])
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class ParentPortalController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get("profile")
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getProfile(userId, tenantId);
  }

  @Get("dashboard")
  async getDashboard(@Req() req: any) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getDashboard(userId, tenantId);
  }

  @Get("children")
  async getChildren(@Req() req: any) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getChildren(userId, tenantId);
  }

  @Get("children/:childId/results")
  async getChildResults(@Req() req: any, @Param("childId") childId: string) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getChildResults(userId, tenantId, childId);
  }

  @Get("children/:childId/attendance")
  async getChildAttendance(@Req() req: any, @Param("childId") childId: string) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getChildAttendance(userId, tenantId, childId);
  }

  @Get("children/:childId/movement")
  async getChildMovement(@Req() req: any, @Param("childId") childId: string) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getChildMovement(userId, tenantId, childId);
  }

  @Post("children/:childId/movement/authorizations")
  async createPickupAuthorization(
    @Req() req: any,
    @Param("childId") childId: string,
    @Body() dto: CreateParentPickupAuthorizationDto
  ) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.createPickupAuthorization(userId, tenantId, childId, dto);
  }

  @Get("invoices")
  async getInvoices(@Req() req: any, @Query("childId") childId?: string) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.getInvoices(userId, tenantId, childId);
  }

  @Post("invoices/:invoiceId/pay")
  async payInvoice(
    @Req() req: any,
    @Param("invoiceId") invoiceId: string,
    @Body() dto: PayInvoiceDto
  ) {
    const userId = req.user.sub;
    const tenantId = req.workspace.tenantId;
    return this.parentPortalService.payInvoice(userId, tenantId, invoiceId, dto);
  }
}
