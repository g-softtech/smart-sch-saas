import { Controller, Post, Get, Body, Param, Query, UseGuards, UseInterceptors, Req } from '@nestjs/common';
import { StaffService } from '../services/staff.service';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { UpdateStaffStatusDto } from '../dto/update-staff-status.dto';
import { IssueCredentialDto } from '../dto/issue-credential.dto';
import { StaffResponseDto } from '../dto/staff-response.dto';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { WorkspaceContextInterceptor } from '../../identity/interceptors/workspace-context.interceptor';

@Controller('v1/staff')
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceContextInterceptor)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  async createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    const { tenantId, schoolId } = req.workspace;
    const staff = await this.staffService.createStaff(tenantId, schoolId, dto);
    return StaffResponseDto.fromEntity(staff);
  }

  @Get()
  async listStaff(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const parsedSkip = skip ? parseInt(skip, 10) : 0;
    const parsedTake = take ? parseInt(take, 10) : 50;

    const list = await this.staffService.listStaff(tenantId, schoolId, parsedSkip, parsedTake);
    return list.map((staff) => StaffResponseDto.fromEntity(staff));
  }

  @Get(':id')
  async getStaff(@Req() req: any, @Param('id') id: string) {
    const { tenantId, schoolId } = req.workspace;
    const staff = await this.staffService.getStaff(tenantId, schoolId, id);
    return StaffResponseDto.fromEntity(staff);
  }

  @Post(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    const staff = await this.staffService.updateStaffStatus(tenantId, schoolId, id, dto.targetStatus);
    return StaffResponseDto.fromEntity(staff);
  }

  @Post(':id/credentials')
  async issueCredential(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: IssueCredentialDto,
  ) {
    const { tenantId, schoolId } = req.workspace;
    return this.staffService.issueCredential(tenantId, schoolId, id, dto);
  }
}
