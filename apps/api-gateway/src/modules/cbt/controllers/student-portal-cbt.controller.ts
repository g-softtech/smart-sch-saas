import {
  Controller,
  Post,
  Param,
  Req,
  Body,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { CBTAttemptService } from "../services/cbt-attempt.service";

@Controller("api/v1/portal/student/cbt")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class StudentPortalCBTController {
  constructor(private readonly attemptService: CBTAttemptService) {}

  @Post(":id/start")
  async startAttempt(@Req() req: any, @Param("id") examId: string) {
    const studentId = req.user.studentId;
    if (!studentId) throw new Error("Student identity missing from token");
    return this.attemptService.startAttempt(req.workspace.tenantId, req.workspace.schoolId, studentId, examId);
  }

  @Post(":id/answer")
  async saveAnswer(@Req() req: any, @Param("id") examId: string, @Body() dto: any) {
    const studentId = req.user.studentId;
    return this.attemptService.saveAnswer(req.workspace.tenantId, req.workspace.schoolId, studentId, examId, dto);
  }

  @Post(":id/submit")
  async submitAttempt(@Req() req: any, @Param("id") examId: string) {
    const studentId = req.user.studentId;
    return this.attemptService.submitAttempt(req.workspace.tenantId, req.workspace.schoolId, studentId, examId);
  }
}
