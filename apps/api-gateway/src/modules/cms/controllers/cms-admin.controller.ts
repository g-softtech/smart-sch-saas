import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../identity/security/jwt-auth.guard';
import { PoliciesGuard, RequirePermissions } from '../../identity/security/policies.guard';
import { TenantContextGuard } from '../../identity/security/tenant-context.guard';
import { CmsAdminService } from '../services/cms-admin.service';
import { UpdateSiteConfigDto, CreateCmsPageDto, UpdateCmsPageDto, SyncNavigationDto } from '../dto/cms.dto';

@Controller('v1/cms/admin')
@UseGuards(JwtAuthGuard, TenantContextGuard, PoliciesGuard)
export class CmsAdminController {
  constructor(private service: CmsAdminService) {}

  @Get('config')
  @RequirePermissions('website:manage_config')
  async getConfig(@Req() req: any) {
    return this.service.getSiteConfig(req.tenantContext.tenantId, req.tenantContext.schoolId, req.user.id);
  }

  @Put('config')
  @RequirePermissions('website:manage_config')
  async updateConfig(@Req() req: any, @Body() dto: UpdateSiteConfigDto) {
    return this.service.updateSiteConfig(req.tenantContext.tenantId, req.tenantContext.schoolId, req.user.id, dto);
  }

  @Get('pages')
  @RequirePermissions('website:manage_content')
  async getPages(@Req() req: any) {
    return this.service.getPages(req.tenantContext.tenantId, req.tenantContext.schoolId);
  }

  @Post('pages')
  @RequirePermissions('website:manage_content')
  async createPage(@Req() req: any, @Body() dto: CreateCmsPageDto) {
    return this.service.createPage(req.tenantContext.tenantId, req.tenantContext.schoolId, req.user.id, dto);
  }

  @Put('pages/:id')
  @RequirePermissions('website:manage_content')
  async updatePage(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    return this.service.updatePage(req.tenantContext.tenantId, req.tenantContext.schoolId, id, req.user.id, dto);
  }

  @Delete('pages/:id')
  @RequirePermissions('website:manage_content')
  async deletePage(@Req() req: any, @Param('id') id: string) {
    return this.service.deletePage(req.tenantContext.tenantId, req.tenantContext.schoolId, id, req.user.id);
  }

  @Put('navigation')
  @RequirePermissions('website:manage_config')
  async syncNavigation(@Req() req: any, @Body() dto: SyncNavigationDto) {
    return this.service.syncNavigation(req.tenantContext.tenantId, req.tenantContext.schoolId, req.user.id, dto);
  }
}