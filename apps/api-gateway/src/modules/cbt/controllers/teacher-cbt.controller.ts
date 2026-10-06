import {
  Controller,
  Post,
  Param,
  Req,
  Body,
  UseGuards,
  UseInterceptors,
  Put,
  Get
} from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { CBTCompilerService, ReviewAttemptDto } from "../services/cbt-compiler.service";
import { TeacherCBTService } from "../services/teacher-cbt.service";

@Controller("api/v1/academics/teacher/cbt")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class TeacherCBTController {
  constructor(
    private readonly compilerService: CBTCompilerService,
    private readonly teacherCbtService: TeacherCBTService
  ) {}

  @Put("attempts/:attemptId/review")
  @RequirePermission("academics:enter_scores")
  async reviewAttempt(@Req() req: any, @Param("attemptId") attemptId: string, @Body() dto: ReviewAttemptDto) {
    const userId = req.user.sub;
    return this.compilerService.reviewAttempt(
      req.workspace.tenantId,
      req.workspace.schoolId,
      attemptId,
      userId,
      dto
    );
  }

  @Post("exams/:examId/compile")
  @RequirePermission("academics:enter_scores")
  async compileExam(@Req() req: any, @Param("examId") examId: string) {
    const userId = req.user.sub;
    return this.compilerService.compileToGradebook(
      req.workspace.tenantId,
      req.workspace.schoolId,
      examId,
      userId
    );
  }

  @Get("exams")
  @RequirePermission("academics:read_gradebook")
  async getTeacherExams(@Req() req: any) {
    const userId = req.user.sub;
    const exams = await this.teacherCbtService.getTeacherExams(
      req.workspace.tenantId,
      req.workspace.schoolId,
      userId
    );
    return { success: true, data: exams };
  }

  @Get("exams/:examId")
  @RequirePermission("academics:read_gradebook")
  async getTeacherExamDetails(@Req() req: any, @Param("examId") examId: string) {
    const userId = req.user.sub;
    const details = await this.teacherCbtService.getTeacherExamDetails(
      req.workspace.tenantId,
      req.workspace.schoolId,
      userId,
      examId
    );
    return { success: true, data: details };
  }

  @Get("exams/:examId/attempts")
  @RequirePermission("academics:read_gradebook")
  async getTeacherExamAttempts(@Req() req: any, @Param("examId") examId: string) {
    const userId = req.user.sub;
    const attempts = await this.teacherCbtService.getTeacherExamAttempts(
      req.workspace.tenantId,
      req.workspace.schoolId,
      userId,
      examId
    );
    return { success: true, data: attempts };
  }

  @Get("attempts/:attemptId")
  @RequirePermission("academics:read_gradebook")
  async getTeacherAttemptDetail(@Req() req: any, @Param("attemptId") attemptId: string) {
    const userId = req.user.sub;
    const detail = await this.teacherCbtService.getTeacherAttemptDetail(
      req.workspace.tenantId,
      req.workspace.schoolId,
      userId,
      attemptId
    );
    return { success: true, data: detail };
  }
}
