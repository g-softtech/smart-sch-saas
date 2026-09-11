import {
  Controller, Post, Get, Body, Param, Query,
  UseGuards, UseInterceptors, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StudentsService } from '../services/students.service';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { ApiResponseDto } from '../../identity/dto/auth.dto';
import {
  CreateStudentDto,
  CreateGuardianDto,
  LinkGuardianDto,
  CreateEnrollmentDto,
  TransferEnrollmentDto,
  WithdrawStudentDto,
  PaginationQueryDto,
} from '../dto/students.dto';

// ─── AUTHORIZATION NOTE ─────────────────────────────────────────────────────
// The permission catalog for this project has not yet defined domain-specific
// permission strings (e.g. "students:write", "students:read").
// The existing Academics controller (the direct precedent) uses only JwtAuthGuard
// and the WorkspaceContextInterceptor — no PoliciesGuard / @RequirePermission.
//
// Students follows the SAME pattern. Routes are protected by:
//   1. JwtAuthGuard   — rejects unauthenticated requests (401)
//   2. WorkspaceContextInterceptor — validates x-tenant-id membership (400/403)
//                                   and populates tenantContext for PlatformKernel
//
// When a Students permission catalog is introduced, @RequirePermission decorators
// must be added here without changing the underlying service logic.
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Students')
@Controller('api/v1/students')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ─── Students ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new student (post-admission)' })
  @ApiResponse({ status: 201 })
  async createStudent(@Body() dto: CreateStudentDto): Promise<ApiResponseDto<any>> {
    const student = await this.studentsService.createStudent({
      schoolId: dto.schoolId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      nationality: dto.nationality,
      admissionDate: new Date(dto.admissionDate),
    });
    return { success: true, data: student };
  }

  @Get()
  @ApiOperation({ summary: 'List students within the active tenant (optionally filtered by school)' })
  async listStudents(@Query() query: PaginationQueryDto): Promise<ApiResponseDto<any>> {
    const students = await this.studentsService.listStudents(query.schoolId);

    // Simple offset pagination on the returned result set.
    // TODO: push pagination to the repository layer when data volumes require it.
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const paginated = students.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      meta: { page, limit, total: students.length },
    };
  }

  @Get(':studentId')
  @ApiOperation({ summary: 'Get a single student by ID' })
  async getStudent(
    @Param('studentId') studentId: string,
  ): Promise<ApiResponseDto<any>> {
    const student = await this.studentsService.getStudent(studentId);
    return { success: true, data: student };
  }

  // ─── Guardians ─────────────────────────────────────────────────────────────

  @Post('guardians')
  @ApiOperation({ summary: 'Create a new guardian within the active tenant' })
  async createGuardian(@Body() dto: CreateGuardianDto): Promise<ApiResponseDto<any>> {
    const guardian = await this.studentsService.createGuardian(dto);
    return { success: true, data: guardian };
  }

  @Get('guardians/list')
  @ApiOperation({ summary: 'List all guardians within the active tenant' })
  async listGuardians(@Query() query: PaginationQueryDto): Promise<ApiResponseDto<any>> {
    const guardians = await this.studentsService.listGuardians();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const paginated = guardians.slice(start, start + limit);
    return {
      success: true,
      data: paginated,
      meta: { page, limit, total: guardians.length },
    };
  }

  @Post(':studentId/guardians/link')
  @ApiOperation({ summary: 'Link an existing guardian to a student' })
  async linkGuardian(
    @Param('studentId') studentId: string,
    @Body() dto: LinkGuardianDto,
  ): Promise<ApiResponseDto<any>> {
    const link = await this.studentsService.linkGuardian({
      studentId,
      guardianId: dto.guardianId,
      relationship: dto.relationship,
      isPrimary: dto.isPrimary,
      isEmergencyContact: dto.isEmergencyContact,
    });
    return { success: true, data: link };
  }

  @Get(':studentId/guardians')
  @ApiOperation({ summary: "List a student's linked guardians" })
  async listStudentGuardians(
    @Param('studentId') studentId: string,
  ): Promise<ApiResponseDto<any>> {
    const guardians = await this.studentsService.listStudentGuardians(studentId);
    return { success: true, data: guardians };
  }

  // ─── Enrollments ───────────────────────────────────────────────────────────

  @Post(':studentId/enrollments')
  @ApiOperation({ summary: 'Enroll a student into a class for an academic year' })
  async createEnrollment(
    @Param('studentId') studentId: string,
    @Body() dto: CreateEnrollmentDto,
  ): Promise<ApiResponseDto<any>> {
    const enrollment = await this.studentsService.createEnrollment({
      studentId,
      academicYearId: dto.academicYearId,
      classId: dto.classId,
      armId: dto.armId,
    });
    return { success: true, data: enrollment };
  }

  @Get(':studentId/enrollments')
  @ApiOperation({ summary: "List a student's enrollment history (all statuses)" })
  async listEnrollments(
    @Param('studentId') studentId: string,
  ): Promise<ApiResponseDto<any>> {
    const enrollments = await this.studentsService.listEnrollments(studentId);
    return { success: true, data: enrollments };
  }

  @Post(':studentId/enrollments/:enrollmentId/transfer')
  @ApiOperation({ summary: 'Transfer student to a different class/arm (internal, preserves enrollment history)' })
  async transferEnrollment(
    @Param('studentId') _studentId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: TransferEnrollmentDto,
  ): Promise<ApiResponseDto<any>> {
    const newEnrollment = await this.studentsService.transferEnrollment({
      enrollmentId,
      newClassId: dto.newClassId,
      newArmId: dto.newArmId,
      notes: dto.notes,
    });
    return { success: true, data: newEnrollment };
  }

  @Post(':studentId/enrollments/:enrollmentId/withdraw')
  @HttpCode(200)
  @ApiOperation({ summary: 'Withdraw student from their current active enrollment' })
  async withdrawStudent(
    @Param('studentId') studentId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: WithdrawStudentDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.studentsService.withdrawStudent({
      studentId,
      enrollmentId,
      notes: dto.notes,
    });
    return { success: true, data: result };
  }
}
