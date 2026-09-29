import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UseFilters,
  ForbiddenException,
} from "@nestjs/common";
import { TeacherAssignmentsService } from "../services/teacher-assignments.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { PoliciesGuard } from "../../identity/security/policies.guard";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { AcademicsPrismaExceptionFilter } from "../filters/prisma-exception.filter";
import {
  CreateTeacherSubjectAssignmentDto,
  QueryTeacherSubjectAssignmentDto,
  CreateClassTeacherAssignmentDto,
  QueryClassTeacherAssignmentDto,
} from "../dto/teacher-assignments.dto";
import { kernel, tenantContext } from "@saas/core-platform";

@Controller("api/v1/academics")
@UseGuards(JwtAuthGuard, PoliciesGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class TeacherAssignmentsController {
  constructor(
    private readonly teacherAssignmentsService: TeacherAssignmentsService,
  ) {}

  /**
   * Guard helper to enforce self-assignment and self-promotion safeguards.
   * Effective permissions (e.g. academics:manage_assignments) are verified by PoliciesGuard.
   */
  private async assertNoSelfAssignmentOrPromotion(
    req: any,
    targetTeacherId?: string,
  ) {
    const userId = req.user?.sub;
    const { tenantId, schoolId } = req.workspace || {};

    if (!userId || !tenantId || !schoolId) {
      throw new ForbiddenException("Authentication and workspace context required");
    }

    if (targetTeacherId) {
      const ownStaff = await tenantContext.run({ tenantId }, async () =>
        await kernel.db.staffProfile.findFirst({
          where: { userId, tenantId, schoolId },
        }),
      );
      if (ownStaff && ownStaff.id === targetTeacherId) {
        throw new ForbiddenException(
          "Teachers cannot grant, modify, or promote their own assignments",
        );
      }
    }
  }

  // --- TEACHER SUBJECT ASSIGNMENTS ---

  @Post("teacher-subject-assignments")
  @RequirePermission("academics:manage_assignments")
  async createTeacherSubjectAssignment(
    @Req() req: any,
    @Body() dto: CreateTeacherSubjectAssignmentDto,
  ) {
    await this.assertNoSelfAssignmentOrPromotion(req, dto.teacherId);
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.createTeacherSubjectAssignment(
      tenantId,
      schoolId,
      dto,
    );
    return { success: true, data };
  }

  @Get("teacher-subject-assignments")
  @RequirePermission("academics:read_assignments")
  async listTeacherSubjectAssignments(
    @Req() req: any,
    @Query() query: QueryTeacherSubjectAssignmentDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.listTeacherSubjectAssignments(
      tenantId,
      schoolId,
      query,
    );
    return { success: true, data };
  }

  @Get("teacher-subject-assignments/:id")
  @RequirePermission("academics:read_assignments")
  async getTeacherSubjectAssignment(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.getTeacherSubjectAssignment(
      tenantId,
      schoolId,
      id,
    );
    return { success: true, data };
  }

  @Put("teacher-subject-assignments/:id/deactivate")
  @RequirePermission("academics:manage_assignments")
  async deactivateTeacherSubjectAssignment(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;

    const existing = await this.teacherAssignmentsService.getTeacherSubjectAssignment(
      tenantId,
      schoolId,
      id,
    );
    await this.assertNoSelfAssignmentOrPromotion(req, existing.teacherId);

    const data = await this.teacherAssignmentsService.deactivateTeacherSubjectAssignment(
      tenantId,
      schoolId,
      id,
    );
    return { success: true, data };
  }

  // --- CLASS TEACHER ASSIGNMENTS ---

  @Post("class-teacher-assignments")
  @RequirePermission("academics:manage_assignments")
  async createClassTeacherAssignment(
    @Req() req: any,
    @Body() dto: CreateClassTeacherAssignmentDto,
  ) {
    await this.assertNoSelfAssignmentOrPromotion(req, dto.teacherId);
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.createClassTeacherAssignment(
      tenantId,
      schoolId,
      dto,
    );
    return { success: true, data };
  }

  @Get("class-teacher-assignments")
  @RequirePermission("academics:read_assignments")
  async listClassTeacherAssignments(
    @Req() req: any,
    @Query() query: QueryClassTeacherAssignmentDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.listClassTeacherAssignments(
      tenantId,
      schoolId,
      query,
    );
    return { success: true, data };
  }

  @Get("class-teacher-assignments/:id")
  @RequirePermission("academics:read_assignments")
  async getClassTeacherAssignment(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.getClassTeacherAssignment(
      tenantId,
      schoolId,
      id,
    );
    return { success: true, data };
  }

  @Delete("class-teacher-assignments/:id")
  @RequirePermission("academics:manage_assignments")
  async deleteClassTeacherAssignment(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;

    const existing = await this.teacherAssignmentsService.getClassTeacherAssignment(
      tenantId,
      schoolId,
      id,
    );
    await this.assertNoSelfAssignmentOrPromotion(req, existing.teacherId);

    const data = await this.teacherAssignmentsService.deleteClassTeacherAssignment(
      tenantId,
      schoolId,
      id,
    );
    return { success: true, data };
  }
}
