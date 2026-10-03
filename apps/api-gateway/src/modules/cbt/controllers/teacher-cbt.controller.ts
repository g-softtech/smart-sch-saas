import {
  Controller,
  Post,
  Param,
  Req,
  Body,
  UseGuards,
  UseInterceptors,
  Put
} from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { CBTCompilerService, ReviewAttemptDto } from "../services/cbt-compiler.service";

@Controller("api/v1/academics/teacher/cbt")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class TeacherCBTController {
  constructor(private readonly compilerService: CBTCompilerService) {}

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
}
