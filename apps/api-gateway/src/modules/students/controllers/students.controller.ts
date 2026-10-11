import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  Req,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { StudentsService } from "../services/students.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { ApiResponseDto } from "../../identity/dto/auth.dto";
import {
  CreateStudentDto,
  UpdateStudentDto,
  CreateGuardianDto,
  UpdateGuardianDto,
  LinkGuardianDto,
  CreateEnrollmentDto,
  TransferEnrollmentDto,
  WithdrawStudentDto,
  PaginationQueryDto,
} from "../dto/students.dto";

@ApiTags("Students")
@Controller("api/v1/students")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ─── Students ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: "Create a new student (post-admission)" })
  @ApiResponse({ status: 201 })
  async createStudent(
    @Req() req: any,
    @Body() dto: CreateStudentDto,
  ): Promise<ApiResponseDto<any>> {
    const { schoolId, campusId } = req.workspace;
    if (!schoolId) {
      throw new BadRequestException("School context is required");
    }

    const resolvedCampusId = dto.campusId || campusId;

    const student = await this.studentsService.createStudent({
      schoolId,
      campusId: resolvedCampusId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      dob: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      enrolledAt: new Date(dto.admissionDate),
      email: dto.email,
    });
    return { success: true, data: student };
  }

  @Get()
  @ApiOperation({
    summary:
      "List students within the active tenant (optionally filtered by school)",
  })
  async listStudents(
    @Req() req: any,
    @Query() query: PaginationQueryDto,
  ): Promise<ApiResponseDto<any>> {
    const { schoolId, campusId } = req.workspace;
    const resolvedSchoolId = query.schoolId || schoolId;
    const students = await this.studentsService.listStudents(
      resolvedSchoolId,
      campusId,
      query.search,
      query.academicYearId,
      query.classId,
      query.armId,
    );

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

  @Get(":studentId")
  @ApiOperation({ summary: "Get a single student by ID" })
  async getStudent(
    @Param("studentId") studentId: string,
  ): Promise<ApiResponseDto<any>> {
    const student = await this.studentsService.getStudent(studentId);
    return { success: true, data: student };
  }

  @Patch(":studentId")
  @ApiOperation({ summary: "Update student details" })
  async updateStudent(
    @Param("studentId") studentId: string,
    @Body() dto: UpdateStudentDto,
  ): Promise<ApiResponseDto<any>> {
    const updated = await this.studentsService.updateStudent(studentId, {
      ...dto,
      dob: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
    });
    return { success: true, data: updated };
  }

  // ─── Guardians ─────────────────────────────────────────────────────────────

  @Post("guardians")
  @ApiOperation({ summary: "Create a new guardian within the active tenant" })
  async createGuardian(
    @Body() dto: CreateGuardianDto,
  ): Promise<ApiResponseDto<any>> {
    const guardian = await this.studentsService.createGuardian({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      relationship: "Guardian",
      address: dto.address,
      occupation: dto.occupation,
    });
    return { success: true, data: guardian };
  }

  @Patch("guardians/:guardianId")
  @ApiOperation({ summary: "Update guardian details" })
  async updateGuardian(
    @Param("guardianId") guardianId: string,
    @Body() dto: UpdateGuardianDto,
  ): Promise<ApiResponseDto<any>> {
    const updated = await this.studentsService.updateGuardian(guardianId, dto);
    return { success: true, data: updated };
  }

  @Get("guardians/list")
  @ApiOperation({ summary: "List all guardians within the active tenant" })
  async listGuardians(
    @Req() req: any,
    @Query() query: PaginationQueryDto,
  ): Promise<ApiResponseDto<any>> {
    const schoolId = req.workspace?.schoolId;
    const roleId = req.workspace?.roleId;
    const guardians = await this.studentsService.listGuardians(
      schoolId,
      roleId,
      query.search,
    );
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

  @Post(":studentId/guardians/link")
  @ApiOperation({ summary: "Link an existing guardian to a student" })
  async linkGuardian(
    @Req() req: any,
    @Param("studentId") studentId: string,
    @Body() dto: LinkGuardianDto,
  ): Promise<ApiResponseDto<any>> {
    const schoolId = req.workspace?.schoolId;
    const roleId = req.workspace?.roleId;
    const link = await this.studentsService.linkGuardian({
      studentId,
      guardianId: dto.guardianId,
      relationship: dto.relationship,
      isPrimary: dto.isPrimary,
      canPickup: dto.isEmergencyContact ?? true,
      schoolId,
      roleId,
    });
    return { success: true, data: link };
  }

  @Get(":studentId/guardians")
  @ApiOperation({ summary: "List a student's linked guardians" })
  async listStudentGuardians(
    @Param("studentId") studentId: string,
  ): Promise<ApiResponseDto<any>> {
    const guardians =
      await this.studentsService.listStudentGuardians(studentId);
    return { success: true, data: guardians };
  }

  // ─── Enrollments ───────────────────────────────────────────────────────────

  @Post(":studentId/enrollments")
  @ApiOperation({
    summary: "Enroll a student into a class for an academic year",
  })
  async createEnrollment(
    @Req() req: any,
    @Param("studentId") studentId: string,
    @Body() dto: CreateEnrollmentDto,
  ): Promise<ApiResponseDto<any>> {
    const { campusId, isMultiCampus } = req.workspace;
    const resolvedCampusId = campusId || dto.campusId;
    if (isMultiCampus && !resolvedCampusId) {
      throw new BadRequestException(
        "Campus is required for enrollment in a multi-campus school",
      );
    }
    const enrollment = await this.studentsService.createEnrollment({
      studentId,
      academicYearId: dto.academicYearId,
      classId: dto.classId,
      armId: dto.armId || "",
      campusId: resolvedCampusId,
    });
    return { success: true, data: enrollment };
  }

  @Get(":studentId/enrollments")
  @ApiOperation({
    summary: "List a student's enrollment history (all statuses)",
  })
  async listEnrollments(
    @Param("studentId") studentId: string,
  ): Promise<ApiResponseDto<any>> {
    const enrollments = await this.studentsService.listEnrollments(studentId);
    return { success: true, data: enrollments };
  }

  @Post(":studentId/enrollments/:enrollmentId/transfer")
  @ApiOperation({
    summary:
      "Transfer student to a different class/arm (internal, preserves enrollment history)",
  })
  async transferEnrollment(
    @Req() req: any,
    @Param("studentId") _studentId: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: TransferEnrollmentDto,
  ): Promise<ApiResponseDto<any>> {
    const { campusId, isMultiCampus } = req.workspace;
    if (isMultiCampus && !campusId) {
      throw new BadRequestException(
        "Campus is required for enrollment transfer in a multi-campus school",
      );
    }
    const newEnrollment = await this.studentsService.transferEnrollment({
      enrollmentId,
      newClassId: dto.newClassId,
      newArmId: dto.newArmId,
      newCampusId: campusId,
      notes: dto.notes,
    });
    return { success: true, data: newEnrollment };
  }

  @Post(":studentId/enrollments/:enrollmentId/withdraw")
  @HttpCode(200)
  @ApiOperation({
    summary: "Withdraw student from their current active enrollment",
  })
  async withdrawStudent(
    @Param("studentId") studentId: string,
    @Param("enrollmentId") enrollmentId: string,
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
