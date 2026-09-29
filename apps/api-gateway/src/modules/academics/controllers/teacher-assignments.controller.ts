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
  BadRequestException,
} from "@nestjs/common";
import { TeacherAssignmentsService } from "../services/teacher-assignments.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { AcademicsPrismaExceptionFilter } from "../filters/prisma-exception.filter";
import {
  CreateTeacherSubjectAssignmentDto,
  QueryTeacherSubjectAssignmentDto,
  CreateClassTeacherAssignmentDto,
  QueryClassTeacherAssignmentDto,
} from "../dto/teacher-assignments.dto";
import { kernel } from "@saas/core-platform";

@Controller("api/v1/academics")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class TeacherAssignmentsController {
  constructor(
    private readonly teacherAssignmentsService: TeacherAssignmentsService,
  ) {}

  /**
   * Guard helper to ensure current user is an authorized admin/manager,
   * and NOT a teacher attempting self-assignment or self-promotion.
   */
  private async assertAdminManagementAuthority(
    req: any,
    targetTeacherId?: string,
  ) {
    const userId = req.user?.sub;
    const { tenantId, schoolId } = req.workspace || {};

    if (!userId || !tenantId || !schoolId) {
      throw new ForbiddenException("Authentication and workspace context required");
    }

    const { tenantContext } = require("@saas/core-platform");

    // Check tenant membership role within tenantContext
    const membership = await tenantContext.run({ tenantId }, async () =>
      await kernel.db.userTenantMembership.findFirst({
        where: { userId, tenantId },
        include: { role: true },
      }),
    );

    const isSuperAdmin = membership?.role?.name === "SUPER_ADMIN";
    const isSchoolAdmin =
      membership?.role?.name === "SCHOOL_ADMIN" ||
      membership?.role?.name === "ACADEMIC_ADMIN" ||
      membership?.role?.name === "ADMIN";

    if (!isSuperAdmin && !isSchoolAdmin) {
      // Check if user is a teacher attempting to manipulate assignments
      throw new ForbiddenException(
        "Only authorized academic administrators can manage teacher assignments",
      );
    }

    // Explicit check: if user's own StaffProfile matches targetTeacherId, reject self-assignment/self-promotion
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
  async createTeacherSubjectAssignment(
    @Req() req: any,
    @Body() dto: CreateTeacherSubjectAssignmentDto,
  ) {
    await this.assertAdminManagementAuthority(req, dto.teacherId);
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.createTeacherSubjectAssignment(
      tenantId,
      schoolId,
      dto,
    );
    return { success: true, data };
  }

  @Get("teacher-subject-assignments")
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
  async deactivateTeacherSubjectAssignment(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;

    // Fetch existing assignment to verify target teacher
    const existing = await this.teacherAssignmentsService.getTeacherSubjectAssignment(
      tenantId,
      schoolId,
      id,
    );
    await this.assertAdminManagementAuthority(req, existing.teacherId);

    const data = await this.teacherAssignmentsService.deactivateTeacherSubjectAssignment(
      tenantId,
      schoolId,
      id,
    );
    return { success: true, data };
  }

  // --- CLASS TEACHER ASSIGNMENTS ---

  @Post("class-teacher-assignments")
  async createClassTeacherAssignment(
    @Req() req: any,
    @Body() dto: CreateClassTeacherAssignmentDto,
  ) {
    await this.assertAdminManagementAuthority(req, dto.teacherId);
    const { tenantId, schoolId } = req.workspace;
    const data = await this.teacherAssignmentsService.createClassTeacherAssignment(
      tenantId,
      schoolId,
      dto,
    );
    return { success: true, data };
  }

  @Get("class-teacher-assignments")
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
    await this.assertAdminManagementAuthority(req, existing.teacherId);

    const data = await this.teacherAssignmentsService.deleteClassTeacherAssignment(
      tenantId,
      schoolId,
      id,
    );
    return { success: true, data };
  }
}
