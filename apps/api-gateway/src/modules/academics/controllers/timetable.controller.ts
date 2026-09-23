import {
  Controller,
  Post,
  Get,
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
import { AcademicsPrismaExceptionFilter } from "../filters/prisma-exception.filter";
import { CreateTimetablePeriodDto, CreateTimetableEntryDto } from "../dto/timetable.dto";

@Controller("api/v1/academics/timetable")
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post("periods")
  async createPeriod(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateTimetablePeriodDto,
  ) {
    return this.timetableService.createPeriod(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Get("periods/:academicYearId")
  async listPeriods(
    @Req() req: Request & { workspace: any },
    @Param("academicYearId") academicYearId: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const items = await this.timetableService.listPeriods(tenantId, schoolId, academicYearId);
    return { success: true, data: items };
  }

  @Post("entries")
  async createEntry(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateTimetableEntryDto,
  ) {
    return this.timetableService.createEntry(req.workspace.tenantId, req.workspace.schoolId, dto);
  }

  @Get("class/:academicYearId/:termId/:classId")
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
}
