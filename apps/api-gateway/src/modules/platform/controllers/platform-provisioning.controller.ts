import { Controller, Post, Body, UseGuards, Req, Param, Put } from '@nestjs/common';
import { ProvisionTenantDto } from '../dto/provision-tenant.dto';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { OnboardingService } from '../services/onboarding.service';
import { TenantLifecycleService } from '../services/tenant-lifecycle.service';
import { PlatformAuthGuard } from '../../identity/security/platform-auth.guard';
import { Request } from 'express';

@Controller('api/v1/platform/provisioning')
@UseGuards(PlatformAuthGuard)
export class PlatformProvisioningController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly tenantLifecycleService: TenantLifecycleService,
  ) {}

  @Post('tenant')
  async provisionTenant(@Body() dto: ProvisionTenantDto, @Req() req: Request) {
    const actorId = (req.user as any)?.sub || 'system';
    return await this.onboardingService.provisionTenant(dto, actorId);
  }

  @Post('tenant/:tenantId/school')
  async createSchool(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateSchoolDto,
    @Req() req: Request,
  ) {
    const actorId = (req.user as any)?.sub || 'system';
    return await this.tenantLifecycleService.createSchool(tenantId, dto, actorId);
  }

  @Put('tenant/:tenantId/suspend')
  async suspendTenant(@Param('tenantId') tenantId: string, @Req() req: Request) {
    const actorId = (req.user as any)?.sub || 'system';
    return await this.tenantLifecycleService.suspendTenant(tenantId, actorId);
  }

  @Put('tenant/:tenantId/reactivate')
  async reactivateTenant(@Param('tenantId') tenantId: string, @Req() req: Request) {
    const actorId = (req.user as any)?.sub || 'system';
    return await this.tenantLifecycleService.reactivateTenant(tenantId, actorId);
  }
}
