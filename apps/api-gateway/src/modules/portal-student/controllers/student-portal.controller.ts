import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { StudentPortalService } from "../services/student-portal.service";
import { SubmitStudentAssignmentDto, SubmitStudentCBTDto } from "../dto/student-portal.dto";

@ApiTags("Student Portal BFF")
@Controller(["api/v1/portal/student", "v1/portal/student"])
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class StudentPortalController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  private extractContext(req: any) {
    const { tenantId, schoolId } = req.workspace || {};
    const userId = req.user?.sub;

    if (!tenantId || !schoolId) {
      throw new BadRequestException("Workspace context (tenantId, schoolId) is required");
    }
    if (!userId) {
      throw new BadRequestException("Authenticated user context is required");
    }

    return { tenantId, schoolId, userId };
  }

  @Get("profile")
  @ApiOperation({ summary: "Get authenticated student profile and active enrollment" })
  async getProfile(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getProfile(userId, tenantId, schoolId);
    return { success: true, data };
  }

  @Get("dashboard")
  @ApiOperation({ summary: "Get aggregated student dashboard (timetable, assignments, CBT, attendance)" })
  async getDashboard(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getDashboard(userId, tenantId, schoolId);
    return { success: true, data };
  }

  @Get("timetable")
  @ApiOperation({ summary: "Get student weekly timetable" })
  async getTimetable(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getTimetable(userId, tenantId, schoolId);
    return { success: true, data };
  }

  @Get("assignments")
  @ApiOperation({ summary: "List student homework assignments and submission status" })
  async getAssignments(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getAssignments(userId, tenantId, schoolId);
    return { success: true, data };
  }

  @Post("assignments/:id/submit")
  @ApiOperation({ summary: "Submit student homework assignment" })
  async submitAssignment(
    @Req() req: any,
    @Param("id") assignmentId: string,
    @Body() dto: SubmitStudentAssignmentDto
  ) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.submitAssignment(userId, tenantId, schoolId, assignmentId, dto);
    return { success: true, data };
  }

  @Get("cbt")
  @ApiOperation({ summary: "List student CBT examinations and attempt status" })
  async getCBTExams(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getCBTExams(userId, tenantId, schoolId);
    return { success: true, data };
  }

  @Post("cbt/:id/start")
  @ApiOperation({ summary: "Start student CBT examination attempt" })
  async startCBTAttempt(@Req() req: any, @Param("id") examId: string) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.startCBTAttempt(userId, tenantId, schoolId, examId);
    return { success: true, data };
  }

  @Post("cbt/:id/submit")
  @ApiOperation({ summary: "Submit student CBT examination attempt" })
  async submitCBTAttempt(
    @Req() req: any,
    @Param("id") examId: string,
    @Body() dto: SubmitStudentCBTDto
  ) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.submitCBTAttempt(userId, tenantId, schoolId, examId, dto);
    return { success: true, data };
  }

  @Get("results")
  @ApiOperation({ summary: "Get student published academic results" })
  async getResults(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getResults(userId, tenantId, schoolId);
    return { success: true, data };
  }

  @Get("id-card")
  @ApiOperation({ summary: "Get student active digital QR credential" })
  async getCredential(@Req() req: any) {
    const { tenantId, schoolId, userId } = this.extractContext(req);
    const data = await this.studentPortalService.getCredential(userId, tenantId, schoolId);
    return { success: true, data };
  }
}
