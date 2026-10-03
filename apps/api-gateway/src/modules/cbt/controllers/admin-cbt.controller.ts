import { Controller, Post, Put, Get, Body, Param, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AdminCBTService } from "../services/admin-cbt.service";
import { CreateCBTExamDto, UpdateCBTExamDto, SyncQuestionsDto } from "../dto/admin-cbt.dto";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { tenantContext } from "@saas/core-platform";

@Controller("api/v1/academics/cbt/admin")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class AdminCBTController {
  constructor(private readonly adminCbtService: AdminCBTService) {}

  @Post("exams")
  @RequirePermission("academics:manage_cbt")
  async createDraft(@Req() req: any, @Body() dto: CreateCBTExamDto) {
    const ctx = tenantContext.getStore();
    return this.adminCbtService.createDraft(ctx!.tenantId, req.headers["x-school-id"], dto);
  }

  @Put("exams/:examId")
  @RequirePermission("academics:manage_cbt")
  async updateExam(@Req() req: any, @Param("examId") examId: string, @Body() dto: UpdateCBTExamDto) {
    const ctx = tenantContext.getStore();
    return this.adminCbtService.updateExam(ctx!.tenantId, req.headers["x-school-id"], examId, dto);
  }

  @Put("exams/:examId/questions")
  @RequirePermission("academics:manage_cbt")
  async syncQuestions(@Req() req: any, @Param("examId") examId: string, @Body() dto: SyncQuestionsDto) {
    const ctx = tenantContext.getStore();
    return this.adminCbtService.syncQuestions(ctx!.tenantId, req.headers["x-school-id"], examId, dto);
  }

  @Post("exams/:examId/publish")
  @RequirePermission("academics:manage_cbt")
  async publishExam(@Req() req: any, @Param("examId") examId: string) {
    const ctx = tenantContext.getStore();
    const ipAddress = req.ip || "unknown";
    return this.adminCbtService.publishExam(ctx!.tenantId, req.headers["x-school-id"], examId, req.user.sub, ipAddress);
  }

  @Get("exams/:examId")
  @RequirePermission("academics:manage_cbt")
  async getExam(@Req() req: any, @Param("examId") examId: string) {
    const ctx = tenantContext.getStore();
    return this.adminCbtService.getExam(ctx!.tenantId, req.headers["x-school-id"], examId);
  }
}
