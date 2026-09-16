import { Controller, Post, Get, Body, Req, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AcademicsService } from '../services/academics.service';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { 
  CreateCampusDto, CreateAcademicYearDto, CreateTermDto, 
  CreateDepartmentDto, CreateClassDto, CreateArmDto, 
  CreateSubjectGroupDto, CreateSubjectDto, AcademicsPaginationQueryDto
} from '../dto/academics.dto';

@Controller('api/v1/academics')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('campuses')
  async createCampus(@Body() dto: CreateCampusDto) {
    return this.academicsService.createCampus(dto);
  }

  @Post('academic-years')
  async createAcademicYear(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.academicsService.createAcademicYear(req.workspace.tenantId, dto);
  }

  @Post('terms')
  async createTerm(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateTermDto,
  ) {
    return this.academicsService.createTerm(req.workspace.tenantId, dto);
  }

  @Post('departments')
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.academicsService.createDepartment(dto);
  }

  @Post('classes')
  async createClass(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateClassDto,
  ) {
    return this.academicsService.createClass(req.workspace.tenantId, dto);
  }

  @Post('arms')
  async createArm(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateArmDto,
  ) {
    const tenantId = req.workspace.tenantId;
    return this.academicsService.createArm(tenantId, dto);
  }

  @Post('subject-groups')
  async createSubjectGroup(@Body() dto: CreateSubjectGroupDto) {
    return this.academicsService.createSubjectGroup(dto);
  }

  @Post('subjects')
  async createSubject(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateSubjectDto,
  ) {
    const tenantId = req.workspace.tenantId;
    return this.academicsService.createSubject(tenantId, dto);
  }

  @Get('academic-years')
  async listAcademicYears(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listAcademicYears(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }

  @Get('terms')
  async listTerms(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listTerms(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }

  @Get('classes')
  async listClasses(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listClasses(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }

  @Get('arms')
  async listArms(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listArms(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }

  @Get('subjects')
  async listSubjects(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listSubjects(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }
}
