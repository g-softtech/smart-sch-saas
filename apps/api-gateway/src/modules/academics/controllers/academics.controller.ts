import { Controller, Post, Get, Put, Delete, Body, Param, Req, Query, UseGuards, UseInterceptors, UseFilters } from '@nestjs/common';
import { AcademicsService } from '../services/academics.service';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';
import { AcademicsPrismaExceptionFilter } from '../filters/prisma-exception.filter';
import { 
  CreateCampusDto, CreateAcademicYearDto, CreateTermDto, 
  CreateDepartmentDto, CreateClassDto, CreateArmDto, 
  CreateSubjectGroupDto, CreateSubjectDto, AcademicsPaginationQueryDto,
  UpdateAcademicYearDto, UpdateClassDto, UpdateArmDto
} from '../dto/academics.dto';

@Controller('api/v1/academics')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
@UseFilters(AcademicsPrismaExceptionFilter)
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) {}

  @Post('campuses')
  async createCampus(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateCampusDto
  ) {
    return this.academicsService.createCampus(req.workspace.tenantId, dto);
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
  async createDepartment(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateDepartmentDto
  ) {
    return this.academicsService.createDepartment(req.workspace.tenantId, dto);
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
  async createSubjectGroup(
    @Req() req: Request & { workspace: any },
    @Body() dto: CreateSubjectGroupDto
  ) {
    return this.academicsService.createSubjectGroup(req.workspace.tenantId, dto);
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

  @Get('campuses')
  async listCampuses(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listCampuses(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }

  @Get('subject-groups')
  async listSubjectGroups(
    @Req() req: Request & { workspace: any },
    @Query() query: AcademicsPaginationQueryDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 50);
    const items = await this.academicsService.listSubjectGroups(tenantId, schoolId, skip, take);
    return { success: true, data: items };
  }

  @Put('academic-years/:id')
  async updateAcademicYear(
    @Req() req: Request & { workspace: any },
    @Param('id') id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    const { tenantId } = req.workspace;
    return this.academicsService.updateAcademicYear(tenantId, id, dto);
  }

  @Delete('academic-years/:id')
  async deleteAcademicYear(
    @Req() req: Request & { workspace: any },
    @Param('id') id: string,
  ) {
    const { tenantId } = req.workspace;
    return this.academicsService.deleteAcademicYear(tenantId, id);
  }

  @Put('classes/:id')
  async updateClass(
    @Req() req: Request & { workspace: any },
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    const { tenantId } = req.workspace;
    return this.academicsService.updateClass(tenantId, id, dto);
  }

  @Delete('classes/:id')
  async deleteClass(
    @Req() req: Request & { workspace: any },
    @Param('id') id: string,
  ) {
    const { tenantId } = req.workspace;
    return this.academicsService.deleteClass(tenantId, id);
  }

  @Put('arms/:id')
  async updateArm(
    @Req() req: Request & { workspace: any },
    @Param('id') id: string,
    @Body() dto: UpdateArmDto,
  ) {
    const { tenantId } = req.workspace;
    return this.academicsService.updateArm(tenantId, id, dto);
  }

  @Delete('arms/:id')
  async deleteArm(
    @Req() req: Request & { workspace: any },
    @Param('id') id: string,
  ) {
    const { tenantId } = req.workspace;
    return this.academicsService.deleteArm(tenantId, id);
  }
}
