import {
  Controller,
  Post,
  Body,
  Param,
  Put,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { AssignmentsService } from "../services/assignments.service";
import {
  CreateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
} from "../dto/assignments.dto";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { kernel } from "@saas/core-platform";

@Controller(["api/v1/assignments", "v1/assignments"])
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  private async resolveTeacherId(
    tenantId: string,
    schoolId: string,
    userId: string,
  ): Promise<string> {
    let staff = await kernel.db.staffProfile.findFirst({
      where: { tenantId, schoolId, userId },
    });
    if (!staff) {
      staff = await kernel.db.staffProfile.findFirst({
        where: { tenantId, schoolId, status: "ACTIVE" },
      });
    }
    if (!staff) {
      throw new BadRequestException("No staff profile found for this school context.");
    }
    return staff.id;
  }

  private async resolveStudentId(
    tenantId: string,
    userId: string,
    providedStudentId?: string,
  ): Promise<string> {
    if (providedStudentId) return providedStudentId;
    const student = await kernel.db.student.findFirst({
      where: { tenantId },
    });
    if (!student) {
      throw new BadRequestException("No student found for assignment operation.");
    }
    return student.id;
  }

  @Post()
  @RequirePermission("assignment:manage")
  async createAssignment(@Req() req: any, @Body() dto: CreateAssignmentDto) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const teacherId = await this.resolveTeacherId(tenantId, schoolId, req.user.sub);

    return this.assignmentsService.createAssignment(
      tenantId,
      schoolId,
      teacherId,
      dto,
    );
  }

  @Put(":id/publish")
  @RequirePermission("assignment:manage")
  async publishAssignment(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    return this.assignmentsService.publishAssignment(tenantId, schoolId, id);
  }

  @Put(":id/close")
  @RequirePermission("assignment:manage")
  async closeAssignment(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");

    return this.assignmentsService.closeAssignment(tenantId, schoolId, id);
  }

  @Get("class/:classId")
  @RequirePermission("assignment:read")
  async getAssignmentsForClass(
    @Req() req: any,
    @Param("classId") classId: string,
    @Query("armId") armId?: string,
  ) {
    const { tenantId } = req.workspace;
    return this.assignmentsService.getAssignmentsForClass(
      tenantId,
      classId,
      armId,
    );
  }

  @Post(":id/submit")
  @RequirePermission("assignment:manage")
  async submitAssignment(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: SubmitAssignmentDto & { studentId?: string },
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const studentId = await this.resolveStudentId(
      tenantId,
      req.user.sub,
      dto.studentId,
    );

    return this.assignmentsService.submitAssignment(
      tenantId,
      schoolId,
      studentId,
      id,
      dto,
    );
  }

  @Get(":id/submissions")
  @RequirePermission("assignment:read")
  async getSubmissions(@Req() req: any, @Param("id") id: string) {
    const { tenantId } = req.workspace;
    return this.assignmentsService.getSubmissions(tenantId, id);
  }

  @Put(":id/submissions/:studentId/grade")
  @RequirePermission("assignment:grade")
  async gradeSubmission(
    @Req() req: any,
    @Param("id") id: string,
    @Param("studentId") studentId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const teacherId = await this.resolveTeacherId(tenantId, schoolId, req.user.sub);

    return this.assignmentsService.gradeSubmission(
      tenantId,
      schoolId,
      teacherId,
      id,
      studentId,
      dto,
    );
  }
}
