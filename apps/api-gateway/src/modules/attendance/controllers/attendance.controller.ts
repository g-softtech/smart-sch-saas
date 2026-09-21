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
  Req,
  BadRequestException,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from "@nestjs/swagger";
import { AttendanceService } from "../services/attendance.service";
import {
  BulkCreateAttendanceRegisterDto,
  AttendancePaginationQueryDto,
  AttendanceFilterQueryDto,
  AttendanceRegisterResponseDto,
  AttendanceRecordResponseDto,
} from "../dto/attendance.dto";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { randomUUID } from "crypto";

@ApiTags("Attendance")
@ApiBearerAuth()
@ApiHeader({ name: "x-tenant-id", description: "Tenant ID", required: true })
@ApiHeader({ name: "x-school-id", description: "School ID", required: true })
@Controller(["api/v1/attendance", "v1/attendance"])
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post("registers/bulk")
  @ApiOperation({
    summary: "Bulk create/upsert an attendance register for a class or arm",
  })
  @ApiResponse({ status: 201, type: AttendanceRegisterResponseDto })
  async bulkCreateRegister(
    @Req() req: any,
    @Body() dto: BulkCreateAttendanceRegisterDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const userId = req.user.sub;
    if (!schoolId) throw new BadRequestException("School context is required");
    const register = await this.attendanceService.bulkCreateRegister(
      tenantId,
      schoolId,
      userId,
      dto,
    );
    return AttendanceRegisterResponseDto.fromEntity(register);
  }

  @Get("registers")
  @ApiOperation({
    summary:
      "List attendance registers within the active workspace with pagination and date filtering",
  })
  @ApiResponse({ status: 200, type: [AttendanceRegisterResponseDto] })
  async getRegisters(
    @Req() req: any,
    @Query() query: AttendanceFilterQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const registers = await this.attendanceService.getRegisters(
      tenantId,
      schoolId,
      query.skip,
      query.take,
      query.startDate,
      query.endDate,
    );
    return registers.map((r) => AttendanceRegisterResponseDto.fromEntity(r));
  }

  @Get("registers/:id")
  @ApiOperation({ summary: "Get a single attendance register by ID" })
  @ApiResponse({ status: 200, type: AttendanceRegisterResponseDto })
  async getRegister(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const register = await this.attendanceService.getRegisterById(
      tenantId,
      schoolId,
      id,
    );
    return AttendanceRegisterResponseDto.fromEntity(register);
  }

  @Patch("registers/:id/finalize")
  @HttpCode(200)
  @ApiOperation({
    summary: "Finalize an attendance register, locking it and emitting events",
  })
  @ApiResponse({ status: 200, type: AttendanceRegisterResponseDto })
  async finalizeRegister(@Req() req: any, @Param("id") id: string) {
    const { tenantId, schoolId } = req.workspace;
    const userId = req.user.sub;
    const correlationId = randomUUID();
    if (!schoolId) throw new BadRequestException("School context is required");
    const register = await this.attendanceService.finalizeRegister(
      tenantId,
      schoolId,
      id,
      userId,
      correlationId,
    );
    return AttendanceRegisterResponseDto.fromEntity(register);
  }

  @Get("students/:studentId")
  @ApiOperation({ summary: "List attendance history for a specific student" })
  @ApiResponse({ status: 200, type: [AttendanceRecordResponseDto] })
  async getStudentAttendance(
    @Req() req: any,
    @Param("studentId") studentId: string,
    @Query() query: AttendancePaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    if (!schoolId) throw new BadRequestException("School context is required");
    const records = await this.attendanceService.getStudentAttendance(
      tenantId,
      schoolId,
      studentId,
      query.skip,
      query.take,
    );
    return records.map((r) => {
      const dto = AttendanceRecordResponseDto.fromEntity(r);
      if (r.register) {
        (dto as any).register = AttendanceRegisterResponseDto.fromEntity(
          r.register,
        );
      }
      return dto;
    });
  }
}
