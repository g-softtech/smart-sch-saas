import { Controller, Post, Put, Get, Body, Param, Req, UseGuards, UseInterceptors, Query } from "@nestjs/common";
import { AdminCBTService } from "../services/admin-cbt.service";
import { CBTCompilerService } from "../services/cbt-compiler.service";
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
  constructor(
    private readonly adminCbtService: AdminCBTService,
    private readonly compilerService: CBTCompilerService,
  ) {}

  @Post("exams")
  @RequirePermission("academics:manage_cbt")
  async createDraft(@Req() req: any, @Body() dto: CreateCBTExamDto) {
    const { tenantId, schoolId } = req.workspace;
    return this.adminCbtService.createDraft(tenantId, schoolId, dto);
  }

  @Put("exams/:examId")
  @RequirePermission("academics:manage_cbt")
  async updateExam(@Req() req: any, @Param("examId") examId: string, @Body() dto: UpdateCBTExamDto) {
    const { tenantId, schoolId } = req.workspace;
    return this.adminCbtService.updateExam(tenantId, schoolId, examId, dto);
  }

  @Put("exams/:examId/questions")
  @RequirePermission("academics:manage_cbt")
  async syncQuestions(@Req() req: any, @Param("examId") examId: string, @Body() dto: SyncQuestionsDto) {
    const { tenantId, schoolId } = req.workspace;
    return this.adminCbtService.syncQuestions(tenantId, schoolId, examId, dto);
  }

  @Post("exams/:examId/publish")
  @RequirePermission("academics:manage_cbt")
  async publishExam(@Req() req: any, @Param("examId") examId: string) {
    const { tenantId, schoolId } = req.workspace;
    const ipAddress = req.ip || "unknown";
    return this.adminCbtService.publishExam(tenantId, schoolId, examId, req.user.sub, ipAddress);
  }

  @Post("exams/:examId/compile")
  @RequirePermission("academics:manage_cbt")
  async compileExam(@Req() req: any, @Param("examId") examId: string) {
    const { tenantId, schoolId } = req.workspace;
    return this.compilerService.compileToGradebook(tenantId, schoolId, examId, req.user.sub);
  }

  @Get("exams/:examId")
  @RequirePermission("academics:manage_cbt")
  async getExam(@Req() req: any, @Param("examId") examId: string) {
    const { tenantId, schoolId } = req.workspace;
    return this.adminCbtService.getExam(tenantId, schoolId, examId);
  }

  @Get("class/:classId")
  @RequirePermission("academics:manage_cbt")
  async getExamsForClass(
    @Req() req: any,
    @Param("classId") classId: string,
    @Query("armId") armId?: string
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.adminCbtService.getExamsForClass(tenantId, schoolId, classId, armId);
  }
}
