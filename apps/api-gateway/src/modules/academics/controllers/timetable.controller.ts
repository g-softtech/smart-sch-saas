import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
  UseInterceptors,
  UseFilters,
} from "@nestjs/common";
import { TimetableService } from "../services/timetable.service";
import { JwtAuthGuard } from "../../identity/security/jwt-auth.guard";
import { WorkspaceContextInterceptor } from "../../identity/interceptors/workspace-context.interceptor";
import { RequirePermission } from "../../identity/security/require-permission.decorator";
import { AcademicsPrismaExceptionFilter } from "../filters/prisma-exception.filter";
import { CreateTimetablePeriodDto, CreateTimetableEntryDto, UpdateTimetablePeriodDto, UpdateTimetableEntryDto } from "../dto/timetable.dto";

@Controller("api/v1/academics/timetable")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post("periods")
  @RequirePermission("academics:manage_timetable")
  async createPeriod(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateTimetablePeriodDto,
  ) {
    return this.timetableService.createPeriod(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Get("periods/:academicYearId")
  @RequirePermission("academics:read_timetable")
  async listPeriods(
    @Req() req: Request & { workspace: any },
    @Param("academicYearId") academicYearId: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const items = await this.timetableService.listPeriods(tenantId, schoolId, academicYearId);
    return { success: true, data: items };
  }

  @Post("entries")
  @RequirePermission("academics:manage_timetable")
  async createEntry(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateTimetableEntryDto,
  ) {
    return this.timetableService.createEntry(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Get("class/:academicYearId/:termId/:classId")
  @RequirePermission("academics:read_timetable")
  async listClassTimetable(
    @Req() req: Request & { workspace: any },
    @Param("academicYearId") academicYearId: string,
    @Param("termId") termId: string,
    @Param("classId") classId: string,
    @Query("armId") armId?: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const items = await this.timetableService.listClassTimetable(tenantId, schoolId, academicYearId, termId, classId, armId);
    return { success: true, data: items };
  }

  @Get("teacher/:academicYearId/:termId/:teacherId")
  @RequirePermission("academics:read_timetable")
  async listTeacherTimetable(
    @Req() req: Request & { workspace: any },
    @Param("academicYearId") academicYearId: string,
    @Param("termId") termId: string,
    @Param("teacherId") teacherId: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const items = await this.timetableService.listTeacherTimetable(tenantId, schoolId, academicYearId, termId, teacherId);
    return { success: true, data: items };
  }

  @Patch("periods/:id")
  @RequirePermission("academics:manage_timetable")
  async updatePeriod(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
    @Body() dto: UpdateTimetablePeriodDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.updatePeriod(tenantId, schoolId, id, dto);
  }

  @Delete("periods/:id")
  @RequirePermission("academics:manage_timetable")
  async deletePeriod(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.deletePeriod(tenantId, schoolId, id);
  }

  @Patch("entries/:id")
  @RequirePermission("academics:manage_timetable")
  async updateEntry(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
    @Body() dto: UpdateTimetableEntryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.updateEntry(tenantId, schoolId, id, dto);
  }

  @Delete("entries/:id")
  @RequirePermission("academics:manage_timetable")
  async deleteEntry(
    @Req() req: Request & { workspace: any },
    @Param("id") id: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.timetableService.deleteEntry(tenantId, schoolId, id);
  }
}
